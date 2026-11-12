import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { limitFailedAttempts } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Max 10 failed attempts per IP per route every 15 minutes.
const authLimiter = limitFailedAttempts({ max: 10, windowMs: 15 * 60 * 1000 });

router.post('/register', authLimiter, register); // POST /api/auth/register
router.post('/login', authLimiter, login); //       POST /api/auth/login
router.get('/me', requireAuth, getMe); //           GET  /api/auth/me (Bearer token)

export default router;
