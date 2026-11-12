// Authentication service backed by the Artikly REST API.
//
//   register(details)   -> POST /api/auth/register
//   login(credentials)  -> POST /api/auth/login   (returns a JWT)
//   fetchCurrentUser()  -> GET  /api/auth/me      (checks the stored token)
//   logout()            -> clears the stored token (JWTs are stateless, so
//                          there is nothing to tell the server)
//
// Function names and return values are the same as the earlier mock version,
// so AuthProvider and the pages did not need to change.

import { apiRequest } from './apiClient';
import {
  clearSession,
  readSession,
  removeLegacyMockData,
  saveSession,
  updateSessionUser,
} from './session';

// Synchronous so the app knows immediately whether someone is logged in
// when the page loads (no flash of the login page on refresh).
export function getCurrentUser() {
  removeLegacyMockData();
  return readSession()?.user ?? null;
}

export async function login({ email, password }) {
  const { user, token, expiresAt } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  saveSession({ token, user, expiresAt });
  return user;
}

export async function register({ fullName, email, password, confirmPassword }) {
  const { user } = await apiRequest('/auth/register', {
    method: 'POST',
    body: { fullName, email, password, confirmPassword },
  });
  return user;
}

// Confirms the stored token is still valid and refreshes the cached user.
// A rejected token clears the session (handled in apiClient).
export async function fetchCurrentUser() {
  const { user } = await apiRequest('/auth/me');
  updateSessionUser(user);
  return user;
}

export function logout() {
  clearSession();
}
