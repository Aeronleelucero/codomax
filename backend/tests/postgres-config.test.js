import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkServerIdentity } from 'node:tls';
import pool, { databaseConfig } from '../src/config/postgres.js';

test('URL SSL options cannot weaken explicit certificate and hostname verification', () => {
  const config = databaseConfig('postgresql://example.com/test?sslmode=no-verify', { sslMode: 'verify-full', caFile: null });
  assert.equal(config.ssl.rejectUnauthorized, true);
  assert.equal(config.ssl.checkServerIdentity, checkServerIdentity);
  assert.equal(config.connectionString, undefined);
});
test('plaintext PostgreSQL is restricted to explicit local connections', () => {
  assert.equal(databaseConfig('postgresql://localhost/test', { sslMode: 'disable', caFile: null }).ssl, false);
  assert.throws(() => databaseConfig('postgresql://example.com/test', { sslMode: 'disable', caFile: null }), /restricted to local/);
});
await pool.end();
