import pg from 'pg';
import { checkServerIdentity } from 'node:tls';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logFailure } from '../utils/logger.js';
import { env } from './env.js';

// Parse the URL before applying TLS options: pg otherwise lets URL sslmode
// silently override the explicit verification policy.
export function databaseConfig(connectionString, { sslMode = process.env.PGSSLMODE,
  caFile = process.env.PGSSLROOTCERT } = {}) {
  const parsed = new pg.Client({ connectionString }).connectionParameters;
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.host);
  if (sslMode === 'disable' && !local) throw new Error('PGSSLMODE=disable is restricted to local PostgreSQL.');
  const caPath = caFile && resolve(fileURLToPath(new URL('../../', import.meta.url)), caFile);
  return {
    host: parsed.host, port: parsed.port, database: parsed.database,
    user: parsed.user, password: parsed.password,
    ssl: sslMode === 'disable' ? false : { ...(parsed.ssl && typeof parsed.ssl === 'object' ? parsed.ssl : {}),
      ...(caPath && { ca: readFileSync(caPath, 'utf8') }), rejectUnauthorized: true, checkServerIdentity },
    max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000,
  };
}
const pool = new pg.Pool(databaseConfig(env.databaseUrl));
pool.on('error', () => logFailure('database_pool_error'));
export default pool;
