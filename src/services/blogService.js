// MOCK blog service backed by localStorage.
//
// Every function is async and returns plain objects, exactly like a REST API
// client would. To connect a backend later, swap each body for a fetch call:
//   getPublishedBlogs()        -> GET    /api/blogs
//   getBlogById(id)            -> GET    /api/blogs/:id
//   getBlogsByAuthor(authorId) -> GET    /api/users/:authorId/blogs
//   createBlog(input, author)  -> POST   /api/blogs
//   updateBlog(id, input)      -> PUT    /api/blogs/:id
//   deleteBlog(id)             -> DELETE /api/blogs/:id
// On a real server, ownership checks happen there, using the logged-in user.

import { SEED_BLOGS } from '../data/blogs';
import { readJSON, writeJSON } from '../utils/storage';
import { createId, simulateNetwork } from '../utils/mockApi';

const BLOGS_KEY = 'codomax.blogs';

function loadBlogs() {
  const blogs = readJSON(BLOGS_KEY, null);
  if (Array.isArray(blogs)) return blogs;
  writeJSON(BLOGS_KEY, SEED_BLOGS);
  return SEED_BLOGS;
}

function saveBlogs(blogs) {
  if (!writeJSON(BLOGS_KEY, blogs)) {
    throw new Error('Your browser storage is full or unavailable, so the changes were not saved.');
  }
}

// Only these fields can be set by the user. Everything else (id, author,
// dates) is controlled by the service, just like a server would do.
function pickEditableFields(input) {
  return {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    content: input.content.trim(),
    category: input.category,
    coverImage: input.coverImage.trim(),
    status: input.status === 'published' ? 'published' : 'draft',
  };
}

const newestPublishedFirst = (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt);
const recentlyUpdatedFirst = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

function findOwnedBlog(blogs, id, authorId) {
  const blog = blogs.find((b) => b.id === id);
  if (!blog) throw new Error('This post no longer exists. It may have been deleted.');
  if (blog.authorId !== authorId) throw new Error('You can only change your own posts.');
  return blog;
}

export async function getPublishedBlogs() {
  await simulateNetwork();
  return loadBlogs()
    .filter((blog) => blog.status === 'published')
    .sort(newestPublishedFirst);
}

export async function getBlogById(id) {
  await simulateNetwork();
  return loadBlogs().find((blog) => blog.id === id) ?? null;
}

export async function getBlogsByAuthor(authorId) {
  await simulateNetwork();
  return loadBlogs()
    .filter((blog) => blog.authorId === authorId)
    .sort(recentlyUpdatedFirst);
}

export async function createBlog(input, author) {
  await simulateNetwork();
  const now = new Date().toISOString();
  const fields = pickEditableFields(input);

  const blog = {
    id: createId('post'),
    ...fields,
    authorId: author.id,
    authorName: author.name,
    featured: false,
    createdAt: now,
    updatedAt: now,
    publishedAt: fields.status === 'published' ? now : null,
  };

  saveBlogs([blog, ...loadBlogs()]);
  return blog;
}

export async function updateBlog(id, input, authorId) {
  await simulateNetwork();
  const blogs = loadBlogs();
  const existing = findOwnedBlog(blogs, id, authorId);
  const now = new Date().toISOString();
  const fields = pickEditableFields(input);

  const updated = {
    ...existing,
    ...fields,
    updatedAt: now,
    // Keep the original publish date when editing a post that is already live.
    publishedAt: fields.status === 'published' ? (existing.publishedAt ?? now) : null,
  };

  saveBlogs(blogs.map((blog) => (blog.id === id ? updated : blog)));
  return updated;
}

export async function deleteBlog(id, authorId) {
  await simulateNetwork();
  const blogs = loadBlogs();
  findOwnedBlog(blogs, id, authorId);
  saveBlogs(blogs.filter((blog) => blog.id !== id));
}
