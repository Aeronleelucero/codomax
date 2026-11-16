import { apiRequest, resetCsrf } from './apiClient';

export async function login({ email, password }) {
  const { user } = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  resetCsrf(); // The server rotated the session and invalidated the anonymous CSRF value.
  return user;
}
export async function register(details) {
  const { user } = await apiRequest('/auth/register', { method: 'POST', body: details });
  return user;
}
export async function fetchCurrentUser() {
  const { user } = await apiRequest('/auth/me');
  return user;
}
export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' });
  resetCsrf();
}
export async function updateProfile(details) {
  const { user } = await apiRequest('/auth/profile', { method: 'PATCH', body: details });
  return user;
}
export async function changePassword(details) {
  await apiRequest('/auth/password', { method: 'PUT', body: details });
  resetCsrf();
}
