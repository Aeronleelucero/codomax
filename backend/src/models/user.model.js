
import pool from '../config/postgres.js';

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT id, full_name, email, password_hash, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

export const createUser = async ({ fullName, email, passwordHash }) => {
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [fullName, email, passwordHash]
  );

  return result.rows[0].id;
};

export const getPublicUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, full_name, email, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};
