import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { cookieOptions, CSRF_COOKIE, readCookie, SESSION_COOKIE } from '../utils/cookies.js';

const MAX_AGE = 60 * 60 * 1000;
function signature(value, req) {
  return createHmac('sha256', env.session.secret)
    .update(JSON.stringify([value, readCookie(req, SESSION_COOKIE) || 'anonymous']))
    .digest('hex');
}
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function validCsrf(token, req) {
  if (typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return false;
  const [timestamp, nonce, mac] = token.split('.');
  const age = Date.now() - Number(timestamp);
  return age >= 0 && age < MAX_AGE && equal(mac, signature(`${timestamp}.${nonce}`, req));
}
export function issueCsrf(req, res) {
  // Reuse valid tokens so requesting one in another tab does not break a form.
  let csrfToken = readCookie(req, CSRF_COOKIE);
  if (!validCsrf(csrfToken, req)) {
    const value = `${Date.now()}.${randomBytes(32).toString('hex')}`;
    csrfToken = `${value}.${signature(value, req)}`;
  }
  res.cookie(CSRF_COOKIE, csrfToken, { ...cookieOptions, maxAge: MAX_AGE });
  res.json({ success: true, data: { csrfToken } });
}
export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('Origin');
  if ((origin && !env.frontendUrls.includes(origin)) || req.get('Sec-Fetch-Site') === 'cross-site') {
    return next(new AppError(403, 'This request origin is not allowed.'));
  }
  const token = req.get('X-CSRF-Token');
  if (!validCsrf(token, req) || !equal(token, readCookie(req, CSRF_COOKIE))) {
    return next(new AppError(403, 'Invalid CSRF token. Refresh the page and try again.'));
  }
  next();
}
