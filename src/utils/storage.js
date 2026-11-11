// A thin wrapper around localStorage.
//
// Only the service files in src/services use this module. When the real
// backend is ready, those services will call an API instead, and no page or
// component will need to change.

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    // Corrupted JSON or storage disabled (e.g. some private browsing modes).
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage is full or unavailable. Callers decide how to report this.
    return false;
  }
}

export function removeItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}
