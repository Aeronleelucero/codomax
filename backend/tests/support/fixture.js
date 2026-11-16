import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { mock } from 'node:test';
import { createMemoryPool } from './memoryPool.js';

export async function startFixture() {
  process.env.SESSION_SECRET = randomBytes(48).toString('hex');
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.NODE_ENV = 'test';
  const { default: pool, databaseConfig } = await import('../../src/config/postgres.js');
  let repository;
  let cleanup = async () => {};
  if (process.env.TEST_DATABASE_URL) {
    const { default: pg } = await import('pg');
    const schema = `auth_test_${randomBytes(10).toString('hex')}`;
    const config = databaseConfig(process.env.TEST_DATABASE_URL, { sslMode: process.env.TEST_PGSSLMODE || process.env.PGSSLMODE });
    const admin = new pg.Pool(config);
    await admin.query(`CREATE SCHEMA ${schema}`);
    repository = new pg.Pool({ ...config, options: `-c search_path=${schema}` });
    const schemaSql = await readFile(new URL('../../database/postgres.sql', import.meta.url), 'utf8');
    try {
      const connection = await repository.connect();
      try { await connection.query(schemaSql);
        await connection.query(await readFile(new URL('../../database/migrations/002-auth-rate-limits.sql', import.meta.url), 'utf8')); } finally { connection.release(); }
    } catch (error) {
      await repository.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
      throw error;
    }
    cleanup = async () => {
      await repository.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    };
  } else { repository = createMemoryPool(); }
  const queryMock = mock.method(pool, 'query', repository.query.bind(repository));
  const connectMock = mock.method(pool, 'connect', repository.connect.bind(repository));
  const { default: app } = await import('../../src/app.js');
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve(instance));
    instance.once('error', reject);
  });
  return { pool: repository, base: `http://127.0.0.1:${server.address().port}/api`,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      queryMock.mock.restore(); connectMock.mock.restore();
      await cleanup(); await pool.end();
    } };
}

export class Client {
  constructor(base) { this.base = base; this.cookies = new Map(); }
  async request(path, { method = 'GET', body, csrf = true, headers = {} } = {}) {
    if (csrf && !['GET', 'HEAD'].includes(method)) {
      const bootstrap = await this.request('/auth/csrf');
      headers['X-CSRF-Token'] = bootstrap.data.csrfToken;
    }
    const response = await fetch(this.base + path, { method, headers: {
      Origin: 'http://localhost:5173',
      Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '),
      ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      if (!value) this.cookies.delete(name); else this.cookies.set(name, value);
    }
    return { status: response.status, headers: response.headers, ...await response.json() };
  }
}
