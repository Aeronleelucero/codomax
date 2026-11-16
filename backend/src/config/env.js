
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url), quiet: true });

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

  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    ttlHours: Number(process.env.SESSION_TTL_HOURS || 24),
    secure: process.env.NODE_ENV === 'production',
  },
  trustProxy: process.env.TRUST_PROXY_CIDRS?.split(',').map((s) => s.trim()).filter(Boolean) || Number(process.env.TRUST_PROXY_HOPS || 0),
};

export function assertServerConfig() {
  const problems = [];

  if (!env.databaseUrl) {
    problems.push('DATABASE_URL must be configured.');
  }

  if (!env.session.secret || env.session.secret.length < 32) {
    problems.push('SESSION_SECRET must be at least 32 characters.');
  }

  if (!Number.isFinite(env.session.ttlHours) || env.session.ttlHours <= 0 || env.session.ttlHours > 720) {
    problems.push('SESSION_TTL_HOURS must be between 0 and 720 hours.');
  }

  if (typeof env.trustProxy === 'number' && (!Number.isInteger(env.trustProxy) || env.trustProxy < 0)) {
    problems.push('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  if (env.nodeEnv === 'production') {
    if (process.env.PGSSLMODE === 'disable') problems.push('Production database TLS must be enabled.');
    if (!env.frontendUrls.length || env.frontendUrls.some((origin) => {
      try { const url = new URL(origin); return url.protocol !== 'https:' || url.origin !== origin; }
      catch { return true; }
    })) problems.push('Production FRONTEND_URL must contain exact HTTPS origins.');
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid configuration in backend/.env:\n  - ${problems.join('\n  - ')}`
    );
  }
}
