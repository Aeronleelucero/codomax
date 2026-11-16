import pool from '../config/postgres.js';

// Keep reset_at as text: JS Date truncates microseconds and cannot match the release predicate.
// PostgreSQL's row lock and database clock make reservations atomic across nodes.
export async function reserveAttempt(key, max, windowMs, db = pool) {
  const { rows: [row] } = await db.query(`INSERT INTO auth_rate_limits (bucket_key, attempts, reset_at)
    VALUES ($1, 1, clock_timestamp() + $3 * interval '1 millisecond')
    ON CONFLICT (bucket_key) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.reset_at <= clock_timestamp() THEN 1
        ELSE LEAST(auth_rate_limits.attempts + 1, $2 + 1) END,
      reset_at = CASE WHEN auth_rate_limits.reset_at <= clock_timestamp()
        THEN clock_timestamp() + $3 * interval '1 millisecond' ELSE auth_rate_limits.reset_at END
    RETURNING attempts, reset_at::text AS reset_at, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reset_at - clock_timestamp())))) AS retry_after`,
  [key, max, windowMs]);
  return { allowed: row.attempts <= max, resetAt: row.reset_at, retryAfter: Number(row.retry_after) };
}
export async function releaseAttempt(key, resetAt, db = pool) {
  await db.query(`UPDATE auth_rate_limits SET attempts = GREATEST(0, attempts - 1)
    WHERE bucket_key = $1 AND reset_at = $2`, [key, resetAt]);
}
