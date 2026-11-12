// The single place where the frontend talks to the Artikly REST API.
//
// - Adds the JWT from the current session as "Authorization: Bearer <token>".
// - Returns the `data` part of a successful response.
// - Throws ApiError with the server's message (and field errors) otherwise.
// - When the server rejects our token (401), clears the session and fires
//   SESSION_EXPIRED_EVENT so AuthProvider can log the user out everywhere.

import { clearSession, readSession } from './session';

// In development Vite proxies "/api" to the backend (see vite.config.js).
// For other setups, set VITE_API_URL, e.g. https://api.example.com/api
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const SESSION_EXPIRED_EVENT = 'artikly:session-expired';

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? {};
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const token = readSession()?.token;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "We can't reach the Artikly server right now. Please check that it's running and try again.",
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const message =
      payload?.message ??
      (response.status >= 500
        ? 'The server ran into a problem. Please try again in a moment.'
        : `Request failed (${response.status}).`);
    throw new ApiError(message, response.status, payload?.errors);
  }

  return payload?.data ?? {};
}
