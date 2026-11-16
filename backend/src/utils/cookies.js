import { env } from '../config/env.js';

export const SESSION_COOKIE = env.session.secure ? '__Host-artikly-session' : 'artikly-session';
export const CSRF_COOKIE = env.session.secure ? '__Host-artikly-csrf' : 'artikly-csrf';
export const cookieOptions = { httpOnly: true, secure: env.session.secure, sameSite: 'lax', path: '/' };

export function readCookie(req, name) {
  const values = (req.get('Cookie') || '').split(';').map((part) => part.trim());
  const matches = values.filter((part) => part.startsWith(`${name}=`));
  // Ambiguous cookies are rejected, including sibling-domain cookie injection.
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}
