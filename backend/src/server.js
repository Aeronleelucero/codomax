import app from './app.js';
import pool from './config/postgres.js';
import { assertServerConfig, env } from './config/env.js';

const startServer = async () => {
  try {
    assertServerConfig();

    await pool.query('SELECT 1');

    console.log('Supabase PostgreSQL connection verified.');

    const server = app.listen(env.port, () => {
      console.log(`
========================================
       ARTIKLY BACKEND SERVER
========================================
 Environment: ${env.nodeEnv}
 Port:        ${env.port}
 Database:    Supabase PostgreSQL
 Health:      http://localhost:${env.port}/api/health
========================================
      `);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down...`);

      server.close(async () => {
        await pool.end();
        console.log('Server and database connections closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('Backend startup failed:', error.message);
    await pool.end();
    process.exit(1);
  }
};

startServer();