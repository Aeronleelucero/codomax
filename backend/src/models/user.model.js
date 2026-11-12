import pool from '../config/db.js';

export const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT id, full_name, email, password_hash, created_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
};

export const createUser = async ({ fullName, email, passwordHash }) => {
  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash)
     VALUES (?, ?, ?)`,
    [fullName, email, passwordHash]
  );

  return result.insertId;
};

export const getPublicUserById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, full_name, email, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};