import { createHmac } from 'node:crypto';
import { env } from '../config/env.js';
import { reserveAttempt, releaseAttempt } from '../models/rateLimit.model.js';
import { logFailure } from '../utils/logger.js';

export function limitFailedAttempts({ max = 10, accountMax = 30, windowMs = 15 * 60 * 1000 } = {}) {
  return async (req, res, next) => {
    const route = req.path;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 255) : '';
    const identities = [['ip', req.ip, route, max]];
    // Also throttle distributed password guessing against the same account.
    if (route === '/login' && email) identities.push(['account', email, route, accountMax]);
    const reservations = [];
    try {
      for (const [scope, identity, path, limit] of identities) {
        const key = createHmac('sha256', env.session.secret).update(JSON.stringify([scope, identity, path])).digest('hex');
        const slot = await reserveAttempt(key, limit, windowMs);
        if (!slot.allowed) {
          res.set('Retry-After', String(slot.retryAfter));
          return res.status(429).json({ success: false, message: 'Too many failed attempts. Please try again later.' });
        }
        reservations.push({ key, resetAt: slot.resetAt });
      }
    } catch {
      logFailure('rate_limit_unavailable');
      return res.status(503).json({ success: false, message: 'Authentication is temporarily unavailable.' });
    }
    res.on('finish', () => {
      if (res.statusCode < 400) {
        Promise.all(reservations.map(({ key, resetAt }) => releaseAttempt(key, resetAt)))
          .catch(() => logFailure('rate_limit_unavailable'));
      }
    });
    next();
  };
}
