import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // FRONTEND_URL may list several origins separated by commas, e.g.
  // "http://localhost:5173,http://localhost:4173" (dev server + vite preview).
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

// Called by server.js before it starts listening, so a misconfigured server
// fails immediately with a clear message instead of failing on first login.
// (Scripts such as db.test.js don't need JWT settings, so this isn't run on import.)
export function assertServerConfig() {
  const problems = [];
  if (!env.db.user || !env.db.name) problems.push('DB_USER and DB_NAME must be set.');
  if (!env.jwt.secret || env.jwt.secret.length < 32) {
    problems.push('JWT_SECRET must be set to a random string of at least 32 characters.');
  }
  if (problems.length > 0) {
    throw new Error(`Invalid configuration in backend/.env:\n  - ${problems.join('\n  - ')}`);
  }
}
