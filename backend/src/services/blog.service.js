import {
  deleteBlogById,
  findBlogById,
  findBlogsByAuthor,
  findPublishedBlogs,
  insertBlog,
  updateBlogById,
} from '../models/blog.model.js';
import { AppError, throwIfInvalid } from '../utils/AppError.js';
import { cleanString, countWords, isValidHttpUrl, parseId } from '../utils/validators.js';

// Must match the frontend list in src/data/categories.js.
export const CATEGORIES = ['Development', 'Design', 'Career', 'Productivity', 'Technology', 'Lifestyle'];

export const BLOG_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  excerptMin: 20,
  excerptMax: 220,
  contentMinWords: 50,
  contentMaxChars: 100_000,
  coverImageMax: 2048,
};

// Validates and cleans article input.
// Drafts only need a title so writers can save early; publishing requires
// every field so readers never see an incomplete article. (Same rules as the
// React editor.)
function validateBlogInput(body = {}) {
  const status = body.status === undefined ? 'draft' : body.status;
  const input = {
    title: cleanString(body.title),
    excerpt: cleanString(body.excerpt),
    content: cleanString(body.content),
    category: cleanString(body.category),
    coverImage: cleanString(body.coverImage),
    status,
  };
  const publish = status === 'published';
  const L = BLOG_LIMITS;
  const errors = {};

  if (status !== 'draft' && status !== 'published') {
    errors.status = 'Status must be "draft" or "published".';
  }

  if (!input.title) errors.title = 'Title is required.';
  else if (input.title.length < L.titleMin) errors.title = `Title must be at least ${L.titleMin} characters.`;
  else if (input.title.length > L.titleMax) errors.title = `Title must be ${L.titleMax} characters or fewer.`;

  if (input.excerpt.length > L.excerptMax) {
    errors.excerpt = `Description must be ${L.excerptMax} characters or fewer.`;
  } else if (publish && !input.excerpt) {
    errors.excerpt = 'A short description is required to publish.';
  } else if (publish && input.excerpt.length < L.excerptMin) {
    errors.excerpt = `Description must be at least ${L.excerptMin} characters.`;
  }

  if (input.content.length > L.contentMaxChars) {
    errors.content = `Content must be ${L.contentMaxChars.toLocaleString('en-US')} characters or fewer.`;
  } else if (publish) {
    const words = countWords(input.content);
    if (words === 0) errors.content = 'Content is required to publish.';
    else if (words < L.contentMinWords) {
      errors.content = `Write at least ${L.contentMinWords} words to publish (currently ${words}).`;
    }
  }

  if (input.category && !CATEGORIES.includes(input.category)) {
    errors.category = `Category must be one of: ${CATEGORIES.join(', ')}.`;
  } else if (publish && !input.category) {
    errors.category = 'Choose a category to publish.';
  }

  if (input.coverImage && (input.coverImage.length > L.coverImageMax || !isValidHttpUrl(input.coverImage))) {
    errors.coverImage = 'Enter a full image URL starting with http:// or https://.';
  }

  throwIfInvalid(errors);
  return input;
}

const notFound = () => new AppError(404, 'Article not found.');

export const listPublishedBlogs = () => findPublishedBlogs();

export const listBlogsByAuthor = (user) => findBlogsByAuthor(user.id);

// Published articles are public. Drafts are visible only to their author;
// everyone else gets 404 so the existence of a draft is not revealed.
export const getBlogForViewer = async (rawId, viewer) => {
  const id = parseId(rawId);
  if (!id) throw notFound();
  const blog = await findBlogById(id);
  if (!blog) throw notFound();
  if (blog.status !== 'published' && blog.authorId !== viewer?.id) throw notFound();
  return blog;
};

export const createBlog = async (body, user) => {
  const input = validateBlogInput(body);
  const id = await insertBlog({ ...input, authorId: user.id });
  return findBlogById(id);
};

// 404 when the article doesn't exist, 403 when it belongs to someone else.
async function findOwnedBlog(rawId, user) {
  const id = parseId(rawId);
  if (!id) throw notFound();
  const blog = await findBlogById(id);
  if (!blog) throw notFound();
  if (blog.authorId !== user.id) throw new AppError(403, 'You can only change your own articles.');
  return blog;
}

export const updateBlog = async (rawId, body, user) => {
  const existing = await findOwnedBlog(rawId, user);
  const input = validateBlogInput(body);
  const updated = await updateBlogById(existing.id, user.id, input);
  if (!updated) throw notFound(); // deleted in the meantime
  return findBlogById(existing.id);
};

export const deleteBlog = async (rawId, user) => {
  const existing = await findOwnedBlog(rawId, user);
  const deleted = await deleteBlogById(existing.id, user.id);
  if (!deleted) throw notFound();
};
