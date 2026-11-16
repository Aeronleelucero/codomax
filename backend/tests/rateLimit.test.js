import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startFixture } from './support/fixture.js';
import { randomBytes } from 'node:crypto';

test('independent limiter clients share atomic counters, release slots and reset expired windows', async () => {
  const fixture = await startFixture();
  try {
    const { limitFailedAttempts } = await import('../src/middleware/rateLimit.middleware.js');
    const { EventEmitter } = await import('node:events');
    // Separate middleware instances emulate different API nodes using one store.
    const nodes = [limitFailedAttempts({ max: 100, accountMax: 2 }), limitFailedAttempts({ max: 100, accountMax: 2 })];
    const email = `${randomBytes(12).toString('hex')}@example.com`;
    for (let i = 0; i < 3; i += 1) {
      const response = new EventEmitter();
      response.set = () => {};
      response.status = (code) => { response.statusCode = code; return response; };
      response.json = () => response;
      let admitted = false;
      await nodes[i % 2]({ path: '/login', ip: `192.0.2.${i + 1}`, body: { email } }, response, () => { admitted = true; });
      assert.equal(admitted, i < 2);
      if (i === 2) assert.equal(response.statusCode, 429);
    }
    const { reserveAttempt, releaseAttempt } = await import('../src/models/rateLimit.model.js');
    const key = randomBytes(32).toString('hex');
    const clients = [await fixture.pool.connect(), await fixture.pool.connect()];
    try {
      const slots = [];
      await Promise.all(clients.map(async (client) => {
        for (let i = 0; i < 10; i += 1) slots.push(await reserveAttempt(key, 5, 60000, client));
      }));
      assert.equal(slots.filter((s) => s.allowed).length, 5);
      assert.ok(slots.every((s) => s.retryAfter > 0));
      // A fresh bucket proves successful requests release exactly one slot.
      const nextKey = randomBytes(32).toString('hex');
      const first = await reserveAttempt(nextKey, 1, 60000, clients[0]);
      await releaseAttempt(nextKey, first.resetAt, clients[1]);
      assert.equal((await reserveAttempt(nextKey, 1, 60000, clients[0])).allowed, true);
      if (process.env.TEST_DATABASE_URL) {
        await clients[0].query("UPDATE auth_rate_limits SET reset_at = clock_timestamp() - interval '1 second' WHERE bucket_key=$1", [key]);
        const reset = await reserveAttempt(key, 5, 60000, clients[1]);
        assert.equal(reset.allowed, true);
        // A late completion from the old window must not decrement this one.
        await releaseAttempt(key, slots[0].resetAt, clients[0]);
        const { rows: [row] } = await clients[1].query('SELECT attempts FROM auth_rate_limits WHERE bucket_key=$1', [key]);
        assert.equal(row.attempts, 1);
        const { rows: [table] } = await clients[0].query("SELECT relrowsecurity FROM pg_class WHERE oid='auth_rate_limits'::regclass");
        assert.equal(table.relrowsecurity, true);
        const { rows: roles } = await clients[0].query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
        for (const role of roles) {
          const { rows: [grants] } = await clients[0].query("SELECT has_table_privilege($1, current_schema() || '.auth_rate_limits', 'SELECT') AS read", [role.rolname]);
          assert.equal(grants.read, false);
        }
      }
    } finally { clients.forEach((c) => c.release()); }
  } finally { await fixture.close(); }
});
