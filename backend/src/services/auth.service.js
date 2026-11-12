import bcrypt from 'bcrypt';
import { createUser, findUserByEmail, getPublicUserById } from '../models/user.model.js';
import { AppError, throwIfInvalid } from '../utils/AppError.js';
import {
  cleanString,
  isValidEmail,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from '../utils/validators.js';

const SALT_ROUNDS = 12;

// Shape returned to clients. Never includes password_hash.
export const toPublicUser = (row) => ({
  id: row.id,
  name: row.full_name,
  email: row.email,
  createdAt: row.created_at,
});

function validateRegistration({ fullName, email, password, confirmPassword }) {
  const errors = {};

  if (!fullName) errors.fullName = 'Full name is required.';
  else if (fullName.length < 2) errors.fullName = 'Full name must be at least 2 characters.';
  else if (fullName.length > 255) errors.fullName = 'Full name must be 255 characters or fewer.';

  if (!email) errors.email = 'Email is required.';
  else if (email.length > 255 || !isValidEmail(email)) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (
    password.length < PASSWORD_MIN_LENGTH ||
    !/[A-Za-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    errors.password = 'Password must be at least 8 characters and contain a letter and a number.';
  } else if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    errors.password = `Password must be ${PASSWORD_MAX_BYTES} characters or fewer.`;
  }

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  const missingRequired = !fullName || !email || !password || !confirmPassword;
  throwIfInvalid(errors, missingRequired ? 'All fields are required.' : undefined);
}

export const registerUser = async (body = {}) => {
  // Passwords are not trimmed: spaces are valid password characters.
  const input = {
    fullName: cleanString(body.fullName),
    email: cleanString(body.email).toLowerCase(),
    password: typeof body.password === 'string' ? body.password : '',
    confirmPassword: typeof body.confirmPassword === 'string' ? body.confirmPassword : '',
  };

  validateRegistration(input);

  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists.', {
      email: 'An account with this email already exists.',
    });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  let userId;
  try {
    userId = await createUser({ fullName: input.fullName, email: input.email, passwordHash });
  } catch (error) {
    // Two sign-ups with the same email at the same moment can both pass the
    // check above; the UNIQUE index on users.email stops the second one.
    if (error.code === '23505') {
      throw new AppError(409, 'An account with this email already exists.', {
        email: 'An account with this email already exists.',
      });
    }
    throw error;
  }

  const user = await getPublicUserById(userId);
  return toPublicUser(user);
};

// A real bcrypt hash used when the email doesn't exist, so "unknown email" and
// "wrong password" take the same time and can't be told apart by timing.
let dummyHashPromise;
const getDummyHash = () => (dummyHashPromise ??= bcrypt.hash('artikly-timing-placeholder', SALT_ROUNDS));

export const loginUser = async (body = {}) => {
  const email = cleanString(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  const errors = {};
  if (!email) errors.email = 'Email is required.';
  else if (!isValidEmail(email)) errors.email = 'Please provide a valid email address.';
  if (!password) errors.password = 'Password is required.';
  throwIfInvalid(errors, !email || !password ? 'Email and password are required.' : undefined);

  const user = await findUserByEmail(email);
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password_hash : await getDummyHash(),
  );

  // Same message for both cases: don't reveal which emails have accounts.
  if (!user || !passwordMatches) {
    throw new AppError(401, 'Incorrect email or password.');
  }

  return toPublicUser(user);
};
