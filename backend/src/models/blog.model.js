
import pool from '../config/postgres.js';

// Shared query for articles and author information.
const SELECT_BLOG = `
  SELECT
    b.id,
    b.author_id,
    u.full_name AS author_name,
    b.title,
    b.excerpt,
    b.content,
    b.category,
    b.cover_image,
    b.status,
    b.is_featured,
    b.published_at,
    b.created_at,
    b.updated_at
  FROM blogs b
  INNER JOIN users u ON u.id = b.author_id
`;

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
  const result = await pool.query(
    `${SELECT_BLOG}
     WHERE b.status = 'published'
     ORDER BY b.published_at DESC, b.id DESC`
  );

  return result.rows.map(toBlog);
};

export const findBlogById = async (id) => {
  const result = await pool.query(
    `${SELECT_BLOG}
     WHERE b.id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] ? toBlog(result.rows[0]) : null;
};

export const findBlogsByAuthor = async (authorId) => {
  const result = await pool.query(
    `${SELECT_BLOG}
     WHERE b.author_id = $1
     ORDER BY b.updated_at DESC, b.id DESC`,
    [authorId]
  );

  return result.rows.map(toBlog);
};

export const insertBlog = async ({
  authorId,
  title,
  excerpt,
  content,
  category,
  coverImage,
  status,
}) => {
  const publishedAt =
    status === 'published' ? new Date() : null;

  const result = await pool.query(
    `INSERT INTO blogs (
      author_id,
      title,
      excerpt,
      content,
      category,
      cover_image,
      status,
      published_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      authorId,
      title,
      excerpt,
      content,
      category || null,
      coverImage,
      status,
      publishedAt,
    ]
  );

  return result.rows[0].id;
};

export const updateBlogById = async (
  id,
  authorId,
  { title, excerpt, content, category, coverImage, status }
) => {
  const isPublished = status === 'published';

  const result = await pool.query(
    `UPDATE blogs
     SET
       title = $1,
       excerpt = $2,
       content = $3,
       category = $4,
       cover_image = $5,
       status = $6,
       published_at = CASE
         WHEN $9::boolean = TRUE
         THEN COALESCE(published_at, CURRENT_TIMESTAMP)
         ELSE NULL
       END
     WHERE id = $7 AND author_id = $8
     RETURNING id`,
    [
      title,
      excerpt,
      content,
      category || null,
      coverImage,
      status,
      id,
      authorId,
      isPublished,
    ]
  );

  return result.rowCount > 0;
};

export const deleteBlogById = async (id, authorId) => {
  const result = await pool.query(
    `DELETE FROM blogs
     WHERE id = $1 AND author_id = $2
     RETURNING id`,
    [id, authorId]
  );

  return result.rowCount > 0;
};
