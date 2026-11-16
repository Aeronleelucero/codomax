// All API traffic uses HttpOnly session cookies. CSRF values live in memory.
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
export const SESSION_EXPIRED_EVENT = 'artikly:session-expired';
let csrfPromise;
let csrfExpiresAt = 0;

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? {};
  }
}
export function resetCsrf() { csrfPromise = undefined; csrfExpiresAt = 0; }

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', cache: 'no-store', ...options });
  } catch {
    throw new ApiError("We can't reach the Artikly server right now. Please try again.", 0);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    // Invalid login credentials must not end an unrelated current session.
    if (response.status === 401 && path !== '/auth/login') {
      resetCsrf();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    if (response.status === 403) resetCsrf();
    throw new ApiError(payload?.message || `Request failed (${response.status}).`, response.status, payload?.errors);
  }
  return payload?.data ?? {};
}
async function getCsrf() {
  if (csrfExpiresAt && Date.now() >= csrfExpiresAt) resetCsrf();
  if (!csrfPromise) {
    csrfPromise = request('/auth/csrf', { headers: { Accept: 'application/json' } })
      .then(({ csrfToken }) => {
        csrfExpiresAt = Number(csrfToken.split('.')[0]) + 60 * 60 * 1000;
        return csrfToken;
      })
      .catch((error) => { resetCsrf(); throw error; });
  }
  return csrfPromise;
}
export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = await getCsrf();
  return request(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
}
