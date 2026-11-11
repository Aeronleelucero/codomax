// MOCK authentication service.
//
// Accounts and the session live in this browser's localStorage only. This is
// NOT secure and is meant for frontend development. When the backend is ready,
// replace the body of each function with an API call (for example
// `fetch('/api/auth/login', ...)`). The function names, inputs and return
// values can stay the same, so AuthProvider and the pages won't need changes.

import { SEED_USERS } from '../data/users';
import { readJSON, removeItem, writeJSON } from '../utils/storage';
import { createId, simulateNetwork } from '../utils/mockApi';

const USERS_KEY = 'codomax.users';
const SESSION_KEY = 'codomax.session';

function getStoredUsers() {
  const users = readJSON(USERS_KEY, null);
  if (Array.isArray(users)) return users;
  writeJSON(USERS_KEY, SEED_USERS);
  return SEED_USERS;
}

// Never expose the password outside this service.
function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Synchronous so the app knows immediately whether someone is logged in
// when the page loads (no flash of the login page on refresh).
export function getCurrentUser() {
  const session = readJSON(SESSION_KEY, null);
  return session && session.id && session.name ? session : null;
}

export async function login({ email, password }) {
  await simulateNetwork();

  const user = getStoredUsers().find((u) => normalizeEmail(u.email) === normalizeEmail(email));
  if (!user || user.password !== password) {
    throw new Error('Incorrect email or password. Please try again.');
  }

  const publicUser = toPublicUser(user);
  if (!writeJSON(SESSION_KEY, publicUser)) {
    throw new Error('Your browser blocked storage, so we could not keep you logged in.');
  }
  return publicUser;
}

export async function register({ fullName, email, password }) {
  await simulateNetwork();

  const users = getStoredUsers();
  const emailTaken = users.some((u) => normalizeEmail(u.email) === normalizeEmail(email));
  if (emailTaken) {
    throw new Error('An account with this email already exists. Try logging in instead.');
  }

  const newUser = {
    id: createId('user'),
    name: fullName.trim(),
    email: email.trim(),
    password,
    createdAt: new Date().toISOString(),
  };

  if (!writeJSON(USERS_KEY, [...users, newUser])) {
    throw new Error('Your browser storage is full or unavailable, so the account was not created.');
  }
  return toPublicUser(newUser);
}

export function logout() {
  removeItem(SESSION_KEY);
}
