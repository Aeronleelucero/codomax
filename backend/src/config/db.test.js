import pool from './db.js';

try {
  const [rows] = await pool.query(
    'SELECT DATABASE() AS database_name, VERSION() AS server_version'
  );

  console.log('MySQL connection successful!');
  console.log(rows[0]);
} catch (error) {
  console.error('MySQL connection failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}