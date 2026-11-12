import { Router } from 'express';
import { create, getMine, getOne, getPublished, remove, update } from '../controllers/blog.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Mounted at /api/blogs
router.get('/', getPublished); //                 public: published articles
router.get('/mine', requireAuth, getMine); //     the logged-in user's articles (drafts too)
router.get('/:id', optionalAuth, getOne); //      public, but drafts only for their author
router.post('/', requireAuth, create); //         create a draft or publish
router.put('/:id', requireAuth, update); //       author only
router.delete('/:id', requireAuth, remove); //    author only

export default router;
