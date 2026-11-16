// Additive migration, pinned to public; rollback on errors or row changes.
import { readFile } from 'node:fs/promises';
import pool from '../config/postgres.js';

let client;
try {
  const sql = await readFile(new URL('../../database/postgres.sql', import.meta.url), 'utf8');
  client = await pool.connect();
  await client.query('BEGIN');
  await client.query('SET LOCAL search_path = public');
  await client.query("SET LOCAL lock_timeout = '10s'");
  const { rows: [target] } = await client.query('SELECT current_database() AS database, current_schema() AS schema');
  console.log('Migration target:', target);
  const required = {
    users: ['id', 'full_name', 'email', 'password_hash', 'created_at', 'updated_at'],
    blogs: ['id', 'author_id', 'title', 'excerpt', 'content', 'category', 'cover_image', 'status', 'is_featured', 'published_at', 'created_at', 'updated_at'],
  };
  const fingerprints = {};
  for (const [table, columns] of Object.entries(required)) {
    const { rows } = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [table]);
    if (!rows.length) continue;
    const missing = columns.filter((column) => !rows.some((row) => row.column_name === column));
    if (missing.length) throw new Error(`Incompatible ${table} schema; missing columns: ${missing.join(', ')}`);
    // Prevent concurrent writes while verifying exact preservation of all rows.
    await client.query(`LOCK TABLE public.${table} IN SHARE ROW EXCLUSIVE MODE`);
    fingerprints[table] = (await client.query(`SELECT count(*)::text AS count,
      md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY id), '')) AS digest FROM public.${table} t`)).rows[0];
  }
  const limiterSql = await readFile(new URL('../../database/migrations/002-auth-rate-limits.sql', import.meta.url), 'utf8');
  // Keep schema changes and verification in our single transaction.
  await client.query(sql.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));
  await client.query(limiterSql);
  for (const [table, before] of Object.entries(fingerprints)) {
    const after = (await client.query(`SELECT count(*)::text AS count,
      md5(COALESCE(string_agg(row_to_json(t)::text, '' ORDER BY id), '')) AS digest FROM public.${table} t`)).rows[0];
    if (before.count !== after.count || before.digest !== after.digest) throw new Error(`Row preservation check failed for ${table}`);
    console.log(`${table}: ${after.count} records preserved; full-row checksum unchanged.`);
  }
  await client.query('COMMIT');
  console.log('PostgreSQL schema and session migration committed.');
} catch (error) {
  if (client) await client.query('ROLLBACK');
  console.error('Migration failed:', error.code || error.name);
  process.exitCode = 1;
} finally { client?.release(); await pool.end(); }
