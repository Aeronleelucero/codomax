// Blog (article) service backed by the Artikly REST API.
//
//   getPublishedBlogs()      -> GET    /api/blogs
//   getBlogById(id)          -> GET    /api/blogs/:id   (null when not found)
//   getBlogsByAuthor()       -> GET    /api/blogs/mine
//   createBlog(input)        -> POST   /api/blogs
//   updateBlog(id, input)    -> PUT    /api/blogs/:id
//   deleteBlog(id)           -> DELETE /api/blogs/:id
//
// Ownership is always derived from the verified server session.

import { apiRequest } from './apiClient';

// Only the fields the editor controls are sent to the server.
function toPayload(input) {
  return {
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    category: input.category,
    coverImage: input.coverImage,
    status: input.status,
  };
}

export async function getPublishedBlogs() {
  const { blogs } = await apiRequest('/blogs');
  return blogs;
}

export async function getBlogById(id) {
  try {
    const { blog } = await apiRequest(`/blogs/${encodeURIComponent(id)}`);
    return blog;
  } catch (error) {
    // Pages show their own "not found" state for a missing article.
    if (error.status === 404) return null;
    throw error;
  }
}

export async function getBlogsByAuthor() {
  const { blogs } = await apiRequest('/blogs/mine');
  return blogs;
}

export async function createBlog(input) {
  const { blog } = await apiRequest('/blogs', { method: 'POST', body: toPayload(input) });
  return blog;
}

export async function updateBlog(id, input) {
  const { blog } = await apiRequest(`/blogs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: toPayload(input),
  });
  return blog;
}

export async function deleteBlog(id) {
  await apiRequest(`/blogs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
