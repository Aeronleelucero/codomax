// Stores the logged-in session (JWT + public user info) in localStorage.
//
// Only this module reads or writes the session, so moving to a different
// storage strategy later (for example HTTP-only cookies) touches one file.
// Note: anything in localStorage is readable by scripts on this page, which is
// why the app never renders user content as raw HTML.

import { readJSON, removeItem, writeJSON } from '../utils/storage';

const SESSION_KEY = 'artikly.auth';

// Keys left behind by the earlier mock (browser-only) version of Artikly.
// They included plaintext passwords, so they are removed on startup.
const LEGACY_MOCK_KEYS = ['artikly.session', 'artikly.users', 'artikly.blogs'];

export function removeLegacyMockData() {
  LEGACY_MOCK_KEYS.forEach(removeItem);
}

export function readSession() {
  const session = readJSON(SESSION_KEY, null);
  if (!session?.token || !session?.user?.id) return null;

  // Don't treat an expired token as a logged-in session.
  if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
    removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

export function saveSession(session) {
  if (!writeJSON(SESSION_KEY, session)) {
    throw new Error('Your browser blocked storage, so we could not keep you logged in.');
  }
}

export function updateSessionUser(user) {
  const session = readSession();
  if (session) writeJSON(SESSION_KEY, { ...session, user });
}

export function clearSession() {
  removeItem(SESSION_KEY);
}
