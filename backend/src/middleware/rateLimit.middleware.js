// Minimal in-memory limiter for brute-force protection on auth routes.
//
// Only FAILED requests (status >= 400) count, so normal users are never
// blocked. Limits reset when the server restarts and are per server process;
// a multi-server deployment would use a shared store (e.g. Redis) instead.

export function limitFailedAttempts({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map(); // key -> { count, resetAt }

  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let entry = attempts.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      attempts.set(key, entry);
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: `Too many failed attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      });
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) entry.count += 1;
    });

    // Drop expired entries now and then so the map can't grow forever.
    if (attempts.size > 10_000) {
      for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);
    }

    next();
  };
}
