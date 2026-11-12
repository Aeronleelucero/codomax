// Applies backend/database/schema.sql to the configured database.
// Usage (from backend/):  npm run db:migrate
//
// The schema only contains "CREATE TABLE IF NOT EXISTS" statements, so this
// never drops or alters existing tables or data.

import { readFile } from 'node:fs/promises';
import pool from '../config/db.js';
import { env } from '../config/env.js';

const schemaUrl = new URL('../../database/schema.sql', import.meta.url);

try {
  const sql = await readFile(schemaUrl, 'utf8');
  const statements = sql
    .split(/;\s*$/m) // statements end with ";" at the end of a line
    .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);

  console.log(`Applying ${statements.length} statement(s) to "${env.db.name}"...`);
  for (const statement of statements) {
    const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1] ?? 'statement';
    await pool.query(statement);
    console.log(`  ✓ ${tableName}`);
  }

  const [tables] = await pool.query('SHOW TABLES');
  console.log('Tables now in database:', tables.map((row) => Object.values(row)[0]).join(', '));
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
