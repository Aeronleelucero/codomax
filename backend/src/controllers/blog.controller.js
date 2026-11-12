import {
  createBlog,
  deleteBlog,
  getBlogForViewer,
  listBlogsByAuthor,
  listPublishedBlogs,
  updateBlog,
} from '../services/blog.service.js';

// req.user is set by requireAuth (always) or optionalAuth (may be null).

export const getPublished = async (req, res, next) => {
  try {
    const blogs = await listPublishedBlogs();
    res.status(200).json({ success: true, data: { blogs } });
  } catch (error) {
    next(error);
  }
};

export const getMine = async (req, res, next) => {
  try {
    const blogs = await listBlogsByAuthor(req.user);
    res.status(200).json({ success: true, data: { blogs } });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const blog = await getBlogForViewer(req.params.id, req.user);
    res.status(200).json({ success: true, data: { blog } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const blog = await createBlog(req.body ?? {}, req.user);
    const message = blog.status === 'published' ? 'Article published.' : 'Draft saved.';
    res.status(201).json({ success: true, message, data: { blog } });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const blog = await updateBlog(req.params.id, req.body ?? {}, req.user);
    res.status(200).json({ success: true, message: 'Article updated.', data: { blog } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await deleteBlog(req.params.id, req.user);
    res.status(200).json({ success: true, message: 'Article deleted.' });
  } catch (error) {
    next(error);
  }
};
