import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { startFixture, Client } from './support/fixture.js';

test('real PostgreSQL migration preserves rows, is repeatable and restricts browser roles',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const fixture = await startFixture();
    try {
      const client = new Client(fixture.base);
      const password = `Test1-${randomBytes(16).toString('hex')}`;
      const email = `${randomBytes(10).toString('hex')}@example.com`;
      assert.equal((await client.request('/auth/register', { method: 'POST', body: {
        fullName: 'Migration Writer', email, password, confirmPassword: password } })).status, 201);
      assert.equal((await client.request('/auth/login', { method: 'POST', body: { email, password } })).status, 200);
      assert.equal((await client.request('/blogs', { method: 'POST', body: { title: 'Preserve this draft' } })).status, 201);
      const connection = await fixture.pool.connect();
      try {
        const snapshot = async () => {
          const results = [];
          for (const table of ['users', 'blogs', 'user_sessions']) {
            results.push((await connection.query(`SELECT row_to_json(t) AS row FROM ${table} t ORDER BY 1::text`)).rows
              .map((r) => JSON.stringify(r.row)).sort());
          }
          return results;
        };
        const before = await snapshot();
        const sql = await readFile(new URL('../database/postgres.sql', import.meta.url), 'utf8');
        await connection.query(sql);
        assert.deepEqual(await snapshot(), before);
        const { rows: tables } = await connection.query(`SELECT relname, relrowsecurity FROM pg_class
          WHERE relnamespace = current_schema()::regnamespace AND relname IN ('users','blogs','user_sessions')`);
        assert.equal(tables.length, 3); assert.ok(tables.every((r) => r.relrowsecurity));
        const { rows: roles } = await connection.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
        for (const { rolname } of roles) {
          for (const table of ['users', 'blogs', 'user_sessions']) {
            const { rows: [access] } = await connection.query(`SELECT
              has_table_privilege($1, current_schema() || '.' || $2, 'SELECT') AS readable,
              has_table_privilege($1, current_schema() || '.' || $2, 'INSERT') AS writable`, [rolname, table]);
            assert.equal(access.readable, false); assert.equal(access.writable, false);
          }
        }
        console.log(`Verified RLS on 3 tables; direct table privileges denied for ${roles.length} browser roles.`);
      } finally { connection.release(); }
    } finally { await fixture.close(); }
  });
