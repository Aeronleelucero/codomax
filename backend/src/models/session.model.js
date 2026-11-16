import { createHash, randomBytes } from 'node:crypto';
import pool from '../config/postgres.js';
import { env } from '../config/env.js';

export const hashSession = (token) => createHash('sha256').update(token).digest('hex');
export const validSessionToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

export async function createSession(userId, client = pool) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.session.ttlHours * 3600000);
  await client.query('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP');
  await client.query(
    'INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashSession(token), userId, expiresAt],
  );
  return { token, expiresAt };
}
export async function findSessionUser(token) {
  if (!validSessionToken(token)) return null;
  const result = await pool.query(`
    SELECT u.id, u.full_name, u.email, u.created_at
    FROM user_sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP`, [hashSession(token)]);
  return result.rows[0] || null;
}
export async function revokeSession(token, client = pool) {
  if (validSessionToken(token)) {
    await client.query('DELETE FROM user_sessions WHERE token_hash = $1', [hashSession(token)]);
  }
}
