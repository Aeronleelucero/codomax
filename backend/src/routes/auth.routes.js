import { Router } from 'express';
import { issueCsrf } from '../middleware/csrf.middleware.js';
import { changePassword, updateProfile } from '../controllers/profile.controller.js';
import { getMe, login, logout, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { limitFailedAttempts } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Max 10 failed attempts per IP per route every 15 minutes.
const authLimiter = limitFailedAttempts({ max: 10, windowMs: 15 * 60 * 1000 });

router.get('/csrf', issueCsrf);
router.post('/logout', logout);
router.patch('/profile', requireAuth, authLimiter, updateProfile);
router.put('/password', requireAuth, authLimiter, changePassword);

router.post('/register', authLimiter, register); // POST /api/auth/register
router.post('/login', authLimiter, login); //       POST /api/auth/login
router.get('/me', requireAuth, getMe); //           GET  /api/auth/me (session cookie)

export default router;
