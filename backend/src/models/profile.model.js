import pool from '../config/postgres.js';

// Account edits and session revocation must commit together.
export async function withLockedUser(id, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, full_name, email, password_hash, created_at FROM users WHERE id = $1 FOR UPDATE', [id]);
    const result = await operation(rows[0], client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export async function saveProfile(client, id, name, email) {
  const { rows } = await client.query(`UPDATE users SET full_name = $1, email = $2,
    updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, full_name, email, created_at`, [name, email, id]);
  return rows[0];
}
export async function savePassword(client, id, passwordHash) {
  await client.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, id]);
  await client.query('DELETE FROM user_sessions WHERE user_id = $1', [id]);
}
