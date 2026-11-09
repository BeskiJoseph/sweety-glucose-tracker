const { Queue } = require('bullmq');
const { REDIS_URL, REMINDER_SCHEDULE_CRON, REMINDER_TIMEZONE } = require('../config/env');

function getRedisConnectionOptions() {
  try {
    const parsed = new URL(REDIS_URL);
    return {
      host: parsed.hostname || 'localhost',
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      maxRetriesPerRequest: null
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null
    };
  }
}

const connection = getRedisConnectionOptions();

let reminderQueue = null;

try {
  reminderQueue = new Queue('daily-reminders', { connection });
} catch (err) {
  console.warn('[BullMQ] Could not initialize reminder queue:', err.message);
}

/**
 * Schedule or update repeatable daily reminder job.
 */
async function scheduleDailyReminderJob() {
  if (!reminderQueue) return;

  try {
    if (typeof reminderQueue.upsertJobScheduler === 'function') {
      await reminderQueue.upsertJobScheduler(
        'daily-reminder-scheduler',
        {
          pattern: REMINDER_SCHEDULE_CRON,
          tz: REMINDER_TIMEZONE
        },
        {
          name: 'send-daily-reminders',
          data: {}
        }
      );
    } else if (typeof reminderQueue.add === 'function') {
      await reminderQueue.add(
        'send-daily-reminders',
        {},
        {
          repeat: {
            pattern: REMINDER_SCHEDULE_CRON,
            tz: REMINDER_TIMEZONE
          }
        }
      );
    }
    console.log(
      `[BullMQ] Repeatable daily reminder scheduled with pattern "${REMINDER_SCHEDULE_CRON}" (${REMINDER_TIMEZONE})`
    );
  } catch (err) {
    console.warn('[BullMQ] Failed to schedule repeatable reminder job:', err.message);
  }
}

async function closeQueue() {
  if (reminderQueue) {
    try {
      await reminderQueue.close();
    } catch {
      // Ignore
    }
  }
}

module.exports = {
  reminderQueue,
  scheduleDailyReminderJob,
  getRedisConnectionOptions,
  closeQueue
};
