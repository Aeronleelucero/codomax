import { findSessionUser } from '../models/session.model.js';
import { toPublicUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { cookieOptions, readCookie, SESSION_COOKIE } from '../utils/cookies.js';

async function loadUser(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const row = await findSessionUser(token);
  if (!row) {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    throw new AppError(401, 'Your session has expired. Please log in again.');
  }
  return toPublicUser(row);
}
export async function requireAuth(req, res, next) {
  try {
    req.user = await loadUser(req, res);
    if (!req.user) throw new AppError(401, 'Please log in to continue.');
    next();
  } catch (error) { next(error); }
}
export async function optionalAuth(req, res, next) {
  try {
    req.user = await loadUser(req, res);
    next();
  } catch (error) { next(error); }
}
