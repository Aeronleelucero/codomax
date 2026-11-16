import assert from 'node:assert/strict';
import { after, before, mock, test } from 'node:test';
import { randomBytes } from 'node:crypto';

process.env.NODE_ENV = 'production';
process.env.FRONTEND_URL = 'https://blog.example.com';
process.env.SESSION_SECRET = randomBytes(48).toString('hex');
process.env.TRUST_PROXY_CIDRS = 'loopback';
const { default: app } = await import('../src/app.js');
const { default: pool } = await import('../src/config/postgres.js');
const { env, assertServerConfig } = await import('../src/config/env.js');
const { logFailure } = await import('../src/utils/logger.js');
let server, base;
before(async () => {
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', (err) => err ? reject(err) : resolve(instance));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((r) => server.close(r)); await pool.end(); });
const secure = { 'X-Forwarded-Proto': 'https', Origin: 'https://blog.example.com' };

test('production rejects HTTP without cookies, permits minimal internal probes', async () => {
  const response = await fetch(`${base}/api/auth/csrf`);
  assert.equal(response.status, 400); assert.equal(response.headers.get('set-cookie'), null);
  const live = await fetch(`${base}/api/health/live`);
  assert.equal(live.status, 200); assert.deepEqual(await live.json(), { success: true, status: 'ok' });
});
test('trusted proxy HTTPS mints host-only secure cookies and security headers', async () => {
  const response = await fetch(`${base}/api/auth/csrf`, { headers: secure });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  for (const value of ['__Host-artikly-csrf=', 'Secure', 'HttpOnly', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.includes(value));
  assert.ok(!cookie.includes('Domain='));
  for (const name of ['content-security-policy', 'strict-transport-security', 'permissions-policy']) assert.ok(response.headers.get(name));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), secure.Origin);
});
test('untrusted peer cannot spoof HTTPS through forwarded headers', async () => {
  app.set('trust proxy', false);
  try { assert.equal((await fetch(`${base}/api/auth/csrf`, { headers: secure })).status, 400); }
  finally { app.set('trust proxy', ['loopback']); }
});
test('disallowed CORS origin receives no allow-origin header and cannot mutate', async () => {
  const headers = { ...secure, Origin: 'https://attacker.example' };
  const read = await fetch(`${base}/api/auth/csrf`, { headers });
  assert.equal(read.headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(`${base}/api/auth/login`, { method: 'POST', headers })).status, 403);
});
test('readiness returns 503 without infrastructure details and liveness survives DB failure', async () => {
  const query = mock.method(pool, 'query', async () => { throw new Error('password=secret postgres://credentials'); });
  try {
    const response = await fetch(`${base}/api/health/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { success: false, status: 'unavailable' });
    assert.equal((await fetch(`${base}/api/health/live`)).status, 200);
  } finally { query.mock.restore(); }
});
test('authentication fails closed and logs only allowlisted events on limiter failure', async () => {
  const csrf = await fetch(`${base}/api/auth/csrf`, { headers: secure });
  const { data } = await csrf.json();
  const query = mock.method(pool, 'query', async () => { throw new Error('password=secret token=private'); });
  const output = mock.method(console, 'error', () => {});
  try {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { ...secure,
      Cookie: csrf.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token': data.csrfToken } });
    assert.equal(response.status, 503);
    logFailure('password=private');
    assert.ok(output.mock.calls.every(({ arguments: args }) => !JSON.stringify(args).includes('private')));
    assert.match(output.mock.calls[0].arguments[0], /rate_limit_unavailable/);
  } finally { query.mock.restore(); output.mock.restore(); }
});
test('startup rejects insecure production origins and invalid proxy hop counts', () => {
  const origins = env.frontendUrls; const trust = env.trustProxy;
  try {
    env.frontendUrls = ['http://blog.example.com'];
    assert.throws(assertServerConfig, /HTTPS origins/);
    env.frontendUrls = origins; env.trustProxy = -1;
    assert.throws(assertServerConfig, /non-negative integer/);
  } finally { env.frontendUrls = origins; env.trustProxy = trust; }
});
