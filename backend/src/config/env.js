
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  // Temporary MariaDB configuration for migration and rollback.
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  // Supabase PostgreSQL configuration.
  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

export function assertServerConfig() {
  const problems = [];

  if (!env.databaseUrl) {
    problems.push('DATABASE_URL must be configured.');
  }

  if (!env.jwt.secret || env.jwt.secret.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters.');
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid configuration in backend/.env:\n  - ${problems.join('\n  - ')}`
    );
  }
}
