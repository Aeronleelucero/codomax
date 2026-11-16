import { loginUser, registerUser } from '../services/auth.service.js';
import { revokeSession } from '../models/session.model.js';
import { cookieOptions, CSRF_COOKIE, readCookie, SESSION_COOKIE } from '../utils/cookies.js';

export const register = async (req, res) => {
  const user = await registerUser(req.body ?? {});
  res.status(201).json({ success: true, message: 'Account created successfully.', data: { user } });
};
export const login = async (req, res) => {
  const { user, token, expiresAt } = await loginUser(req.body ?? {}, readCookie(req, SESSION_COOKIE));
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
  res.clearCookie(CSRF_COOKIE, cookieOptions);
  res.json({ success: true, data: { user, expiresAt } });
};
export const logout = async (req, res) => {
  await revokeSession(readCookie(req, SESSION_COOKIE));
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.clearCookie(CSRF_COOKIE, cookieOptions);
  res.json({ success: true, message: 'Logged out successfully.' });
};
export const getMe = (req, res) => {
  res.json({ success: true, data: { user: req.user } });
};
