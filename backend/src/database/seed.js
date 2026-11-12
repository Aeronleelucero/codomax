// Inserts the demo account, sample authors and sample articles.
// Usage (from backend/):  npm run db:seed
//
// Safe to run repeatedly: existing users (matched by email) and articles
// (matched by author + title) are skipped. Nothing is updated or deleted.

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { env } from '../config/env.js';
import { SEED_AUTHORS } from '../../database/seed/authors.js';
import { SEED_ARTICLES } from '../../database/seed/articles.js';

const SALT_ROUNDS = 12;

async function ensureAuthor(author) {
  const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [author.email]);
  if (existing) return { id: existing.id, created: false };

  // Authors without a known password get a random one that is never stored or shown.
  const password = author.password ?? randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
    [author.name, author.email, passwordHash],
  );
  return { id: result.insertId, created: true };
}

async function ensureArticle(article, authorId) {
  const [[existing]] = await pool.query(
    'SELECT id FROM blogs WHERE author_id = ? AND title = ?',
    [authorId, article.title],
  );
  if (existing) return false;

  await pool.query(
    `INSERT INTO blogs
       (author_id, title, excerpt, content, category, cover_image, status, is_featured,
        published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      authorId,
      article.title,
      article.excerpt,
      article.content,
      article.category,
      article.coverImage,
      article.status,
      article.featured ? 1 : 0,
      article.publishedAt ? new Date(article.publishedAt) : null,
      new Date(article.createdAt),
      new Date(article.updatedAt),
    ],
  );
  return true;
}

try {
  console.log(`Seeding "${env.db.name}"...`);
  const authorIds = new Map();
  let usersCreated = 0;
  let articlesCreated = 0;

  for (const author of SEED_AUTHORS) {
    const { id, created } = await ensureAuthor(author);
    authorIds.set(author.key, id);
    if (created) usersCreated += 1;
    console.log(`  ${created ? '+ created' : '= exists '}  user     ${author.email}`);
  }

  for (const article of SEED_ARTICLES) {
    const authorId = authorIds.get(article.authorId);
    if (!authorId) throw new Error(`Unknown seed author "${article.authorId}" for ${article.id}`);
    const created = await ensureArticle(article, authorId);
    if (created) articlesCreated += 1;
    console.log(`  ${created ? '+ created' : '= exists '}  article  ${article.id} (${article.status})`);
  }

  console.log(`Done: ${usersCreated} user(s) and ${articlesCreated} article(s) added.`);
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
