// Allowlisted events only: never serialize errors, requests, URLs or SQL.
const EVENTS = new Set(['request_failed', 'startup_failed', 'rate_limit_unavailable', 'database_pool_error']);
export function logFailure(event) {
  console.error(JSON.stringify({ level: 'error', event: EVENTS.has(event) ? event : 'request_failed' }));
}
