import bcrypt from 'bcrypt';
import { savePassword, saveProfile, withLockedUser } from '../models/profile.model.js';
import { toPublicUser, validateRegistration } from './auth.service.js';
import { AppError, throwIfInvalid } from '../utils/AppError.js';
import { cleanString, isValidEmail, PASSWORD_MAX_BYTES } from '../utils/validators.js';

async function checkPassword(password, hash) {
  if (typeof password !== 'string' || Buffer.byteLength(password) > PASSWORD_MAX_BYTES ||
      !await bcrypt.compare(password, hash)) {
    throw new AppError(400, 'Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
  }
}
export async function updateOwnProfile(id, body = {}) {
  const name = cleanString(body.fullName);
  const email = cleanString(body.email).toLowerCase();
  const errors = {};
  if (name.length < 2 || name.length > 255) errors.fullName = 'Full name must be between 2 and 255 characters.';
  if (email.length > 255 || !isValidEmail(email)) errors.email = 'Please provide a valid email address.';
  throwIfInvalid(errors);
  try {
    return await withLockedUser(id, async (row, client) => {
      if (!row) throw new AppError(401, 'Please log in again.');
      if (row.email !== email) await checkPassword(body.currentPassword, row.password_hash);
      return toPublicUser(await saveProfile(client, id, name, email));
    });
  } catch (error) {
    if (error.code === '23505') throw new AppError(409, 'An account with this email already exists.', { email: 'Email is already in use.' });
    throw error;
  }
}
export async function changeOwnPassword(id, body = {}) {
  await withLockedUser(id, async (row, client) => {
    if (!row) throw new AppError(401, 'Please log in again.');
    await checkPassword(body.currentPassword, row.password_hash);
    // Apply exactly the registration password rules to changes too.
    validateRegistration({ fullName: row.full_name, email: row.email,
      password: typeof body.password === 'string' ? body.password : '',
      confirmPassword: typeof body.confirmPassword === 'string' ? body.confirmPassword : '' });
    const passwordHash = await bcrypt.hash(body.password, 12);
    await savePassword(client, id, passwordHash);
  });
}
