import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.NODE_ENV = 'production';
const { SESSION_COOKIE, CSRF_COOKIE, cookieOptions, readCookie } = await import('../src/utils/cookies.js');

test('production cookies enforce Secure, HttpOnly, SameSite, root path and host-only scope', () => {
  assert.equal(SESSION_COOKIE, '__Host-artikly-session');
  assert.equal(CSRF_COOKIE, '__Host-artikly-csrf');
  assert.deepEqual(cookieOptions, { secure: true, httpOnly: true, sameSite: 'lax', path: '/' });
  assert.equal(readCookie({ get: () => 'artikly-session=a; artikly-session=b' }, 'artikly-session'), null);
});
