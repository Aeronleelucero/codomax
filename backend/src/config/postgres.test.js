import pool from './postgres.js';

try {
  const result = await pool.query(`
    SELECT
      current_database() AS database_name,
      version() AS server_version,
      NOW() AS server_time
  `);

  console.log('Supabase PostgreSQL connection successful!');
  console.log(result.rows[0]);
} catch (error) {
  console.error('Supabase connection failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}