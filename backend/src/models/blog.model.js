import pool from '../config/db.js';

// All queries use placeholders (?) so user input is never concatenated into SQL.

const SELECT_BLOG = `
  SELECT b.id, b.author_id, u.full_name AS author_name, b.title, b.excerpt, b.content,
         b.category, b.cover_image, b.status, b.is_featured, b.published_at,
         b.created_at, b.updated_at
  FROM blogs b
  INNER JOIN users u ON u.id = b.author_id`;

// Converts a database row into the shape the React frontend already uses.
export const toBlog = (row) => ({
  id: row.id,
  title: row.title,
  excerpt: row.excerpt,
  content: row.content,
  category: row.category ?? '',
  coverImage: row.cover_image,
  status: row.status,
  featured: Boolean(row.is_featured),
  authorId: row.author_id,
  authorName: row.author_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedAt: row.published_at,
});

export const findPublishedBlogs = async () => {
  const [rows] = await pool.execute(
    `${SELECT_BLOG}
     WHERE b.status = 'published'
     ORDER BY b.published_at DESC, b.id DESC`,
  );
  return rows.map(toBlog);
};

export const findBlogById = async (id) => {
  const [rows] = await pool.execute(`${SELECT_BLOG} WHERE b.id = ? LIMIT 1`, [id]);
  return rows[0] ? toBlog(rows[0]) : null;
};

export const findBlogsByAuthor = async (authorId) => {
  const [rows] = await pool.execute(
    `${SELECT_BLOG}
     WHERE b.author_id = ?
     ORDER BY b.updated_at DESC, b.id DESC`,
    [authorId],
  );
  return rows.map(toBlog);
};

export const insertBlog = async ({ authorId, title, excerpt, content, category, coverImage, status }) => {
  const [result] = await pool.execute(
    `INSERT INTO blogs (author_id, title, excerpt, content, category, cover_image, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, IF(? = 'published', CURRENT_TIMESTAMP, NULL))`,
    [authorId, title, excerpt, content, category || null, coverImage, status, status],
  );
  return result.insertId;
};

// `author_id = ?` in the WHERE clause is a second safety net: even if the
// service's ownership check were bypassed, another user's row can't change.
export const updateBlogById = async (id, authorId, { title, excerpt, content, category, coverImage, status }) => {
  const [result] = await pool.execute(
    `UPDATE blogs
     SET title = ?, excerpt = ?, content = ?, category = ?, cover_image = ?, status = ?,
         -- keep the original publish date when a live article is edited
         published_at = IF(? = 'published', COALESCE(published_at, CURRENT_TIMESTAMP), NULL),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND author_id = ?`,
    [title, excerpt, content, category || null, coverImage, status, status, id, authorId],
  );
  return result.affectedRows > 0;
};

export const deleteBlogById = async (id, authorId) => {
  const [result] = await pool.execute('DELETE FROM blogs WHERE id = ? AND author_id = ?', [id, authorId]);
  return result.affectedRows > 0;
};
