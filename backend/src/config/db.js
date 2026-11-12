import mysql from 'mysql2/promise';
import { env } from './env.js';

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Read and write dates as UTC. Together with the session setting below this
  // keeps timestamps correct no matter which timezone the server runs in.
  timezone: 'Z',
});

// Every new connection talks to MariaDB in UTC.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export default pool;
