import { getPublicUserById } from '../models/user.model.js';
import { toPublicUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Reads "Authorization: Bearer <token>" and returns the token, or null.
function readBearerToken(req) {
  const header = req.get('Authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function loadUserFromToken(token) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token. Please log in again.';
    throw new AppError(401, message);
  }

  const row = await getPublicUserById(payload.sub);
  if (!row) throw new AppError(401, 'This account no longer exists. Please log in again.');
  return toPublicUser(row);
}

// Rejects the request with 401 unless a valid token is sent.
// On success, req.user = { id, name, email, createdAt }.
export async function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) throw new AppError(401, 'Please log in to continue.');
    req.user = await loadUserFromToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

// For public routes that show extra content to logged-in users (for example,
// authors previewing their own drafts). No token = anonymous; a bad token is
// still rejected so the client knows its session ended.
export async function optionalAuth(req, res, next) {
  try {
    const token = readBearerToken(req);
    req.user = token ? await loadUserFromToken(token) : null;
    next();
  } catch (error) {
    next(error);
  }
}
