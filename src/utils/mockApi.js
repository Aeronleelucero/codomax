// Helpers that make the mock services behave like a real API.

// Waits a short time so loading states are visible, just like a network request.
export function simulateNetwork(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generates a unique id. A real database would do this on the server.
export function createId(prefix = 'id') {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}
