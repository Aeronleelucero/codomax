import { env } from '../config/env.js';

export function productionSecurity(req, res, next) {
  res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" });
  if (env.session.secure) {
    // Only GET probes may use internal HTTP. Never mint cookies on HTTP.
    const probe = req.method === 'GET' && ['/api/health', '/api/health/live', '/api/health/ready'].includes(req.path);
    if (!req.secure && !probe) return res.status(400).json({ success: false, message: 'HTTPS is required.' });
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
}
