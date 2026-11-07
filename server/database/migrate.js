const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, 'migrations');
  console.log(`[Migrations] Scanning migrations in ${migrationsDir}...`);

  const client = await pool.connect();
  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file]
      );

      if (rowCount === 0) {
        console.log(`[Migrations] Applying ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[Migrations] Successfully applied ${file}`);
      } else {
        console.log(`[Migrations] Already applied: ${file}`);
      }
    }

    console.log('[Migrations] All migrations are up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migrations] Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async () => {
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runMigrations };
