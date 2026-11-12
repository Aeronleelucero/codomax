// Small, dependency-free helpers shared by the services.
// These rules intentionally match the React frontend (src/utils/validation.js)
// so users see the same messages whether a check happens in the browser or here.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password; longer input would be
// silently truncated, so it is rejected instead.
export const PASSWORD_MAX_BYTES = 72;

// Returns a trimmed string, or '' when the value is missing or not a string.
// This prevents crashes such as `(123).trim is not a function`.
export function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

export function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// Route parameters arrive as strings. Only positive whole numbers are valid ids.
export function parseId(value) {
  return /^[1-9]\d{0,18}$/.test(String(value)) ? Number(value) : null;
}
