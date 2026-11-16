import { changeOwnPassword, updateOwnProfile } from '../services/profile.service.js';
import { cookieOptions, CSRF_COOKIE, SESSION_COOKIE } from '../utils/cookies.js';

export async function updateProfile(req, res) {
  const user = await updateOwnProfile(req.user.id, req.body ?? {});
  res.json({ success: true, message: 'Profile updated.', data: { user } });
}
export async function changePassword(req, res) {
  await changeOwnPassword(req.user.id, req.body ?? {});
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.clearCookie(CSRF_COOKIE, cookieOptions);
  res.json({ success: true, message: 'Password changed. Please log in again on all devices.' });
}
