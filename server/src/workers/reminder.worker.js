const { Worker } = require('bullmq');
const { query, closePool } = require('../config/db');
const { getRedisConnectionOptions, scheduleDailyReminderJob } = require('../jobs/reminder.queue');

/**
 * Get current calendar date string in configured timezone.
 *
 * @param {string} [tz='UTC']
 * @returns {string} YYYY-MM-DD
 */
function getReminderDate(tz = 'UTC') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

/**
 * Query patient users with fewer than 4 readings for target date and log reminders.
 * Idempotent: checks and updates reminder_logs table to prevent duplicate logs.
 *
 * @param {string} [customDate] - Optional override date for testing (YYYY-MM-DD)
 * @returns {Promise<Array<object>>} List of generated reminder summaries
 */
async function processDailyReminders(customDate) {
  const targetDate = customDate || getReminderDate(process.env.REMINDER_TIMEZONE || 'UTC');
  console.log(`[Reminder Job] Executing daily reminder processing for date: ${targetDate}`);

  // Find all patient users with < 4 readings for targetDate who have not already been logged today
  const sql = `
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      COALESCE(COUNT(gr.id), 0)::int AS readings_count
    FROM users u
    LEFT JOIN glucose_readings gr
      ON gr.user_id = u.id AND gr.reading_date = $1
    WHERE (u.role IS NULL OR u.role = 'patient')
      AND NOT EXISTS (
        SELECT 1 FROM reminder_logs rl
        WHERE rl.user_id = u.id AND rl.reminder_date = $1
      )
    GROUP BY u.id, u.name, u.email
    HAVING COALESCE(COUNT(gr.id), 0) < 4
    ORDER BY u.name ASC
  `;

  const result = await query(sql, [targetDate]);
  const qualifyingUsers = result.rows;
  const remindersSent = [];

  for (const user of qualifyingUsers) {
    // Record in reminder_logs to prevent duplicate processing
    const logInsert = await query(
      `INSERT INTO reminder_logs (user_id, reminder_date, readings_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, reminder_date) DO NOTHING
       RETURNING id`,
      [user.user_id, targetDate, user.readings_count]
    );

    if (logInsert.rowCount > 0) {
      const message = `[REMINDER] User ${user.user_id} (${user.email}): Only ${user.readings_count}/4 glucose readings logged today (${targetDate}). Remember to log your meals!`;
      console.log(message);
      remindersSent.push({
        userId: user.user_id,
        email: user.email,
        readingsCount: user.readings_count,
        targetDate,
        message
      });
    }
  }

  console.log(
    `[Reminder Job] Completed. Generated ${remindersSent.length} reminders for date ${targetDate}.`
  );
  return remindersSent;
}

let workerInstance = null;

function startWorker() {
  const connection = getRedisConnectionOptions();

  try {
    workerInstance = new Worker(
      'daily-reminders',
      async (job) => {
        console.log(`[Worker] Received job: ${job.name} (ID: ${job.id})`);
        return await processDailyReminders(job.data?.date);
      },
      { connection }
    );

    workerInstance.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully.`);
    });

    workerInstance.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed with error:`, err);
    });

    workerInstance.on('error', (err) => {
      console.warn('[Worker Notice] Redis connection error in worker:', err.message);
    });

    console.log('[Worker] BullMQ reminder background worker started and listening.');
  } catch (err) {
    console.warn('[Worker] Failed to start BullMQ worker:', err.message);
  }

  return workerInstance;
}

// Graceful shutdown handling
async function shutdownWorker() {
  console.log('[Worker] Shutting down reminder worker...');
  if (workerInstance) {
    try {
      await workerInstance.close();
    } catch {
      // Ignore
    }
  }
  await closePool();
  process.exit(0);
}

if (require.main === module) {
  startWorker();
  scheduleDailyReminderJob().catch(() => {});

  process.on('SIGINT', shutdownWorker);
  process.on('SIGTERM', shutdownWorker);
}

module.exports = {
  processDailyReminders,
  startWorker,
  shutdownWorker
};
