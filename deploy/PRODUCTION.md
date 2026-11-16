# Production deployment preparation

These are reviewable local artifacts. Nothing has been deployed and no live database or infrastructure has been modified in this production-preparation task. Existing 7 users and 10 blogs are untouched.

## Configuration and edge

Use `backend/.env.production.example` as a secret-manager template. Set the same random `SESSION_SECRET` on every instance (32+ characters), the verified database URL, exact HTTPS `FRONTEND_URL` origins and `PGSSLROOTCERT`. Do not set VITE_API_URL to an HTTP URL. Prefer the same origin for React and `/api`.

The backend recognizes HTTPS through Express's trusted-proxy configuration. Prefer `TRUST_PROXY_CIDRS` with the exact proxy addresses; `TRUST_PROXY_HOPS` remains available for uniform, fixed-length proxy paths. Never trust arbitrary Internet peers. Firewall the backend so only the trusted proxy can reach it. At the edge overwrite X-Forwarded-For, X-Forwarded-Proto and X-Forwarded-Host. This follows [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/).

`nginx.conf.example` includes HTTPS redirection, TLS 1.2/1.3, forwarding headers, SPA fallback, security/CSP/cache headers and disabled access logging. Replace the example domain/paths, provision certificates, run `nginx -t`, and review the headers before use. It is an example and has not been loaded into a running Nginx instance. The strict API CSP is separate from the frontend CSP, which permits the application's existing HTTPS images and Google Fonts. Tighten external image/font origins if your publishing policy allows it. HSTS does not opt unrelated subdomains into HTTPS.

Production application requests received over HTTP are rejected with 400 before cookies, body parsing or authentication. Internal GET health probes are the only exemptions. The proxy must enforce HTTPS for browser traffic; application enforcement cannot retract credentials a misconfigured client already sent over plaintext.

Cookies remain host-only `__Host-` cookies with Secure, HttpOnly, SameSite=Lax and root path. Signed CSRF values expire in one hour and bind to the current session; all mutations, including login/register/logout, require them. Origins are allowlisted with credentialed CORS; there are no wildcard origins. Production startup rejects non-HTTPS frontend origins and plaintext DB settings. Sessions retain their configured absolute expiration, server-side revocation, and all-device password-change revocation.

## Pending database migration — approval required before live use

`backend/database/migrations/002-auth-rate-limits.sql` creates **only** `auth_rate_limits` and its index/access restrictions. It neither resets nor recreates user/blog/session tables. The regular guarded migration runner now includes this file and verifies existing user/blog checksums. This migration was tested only on a disposable PostgreSQL instance in this task. Do not start the new backend against the live database until the approved migration has been applied; missing limiter storage causes authentication to fail closed with 503.

After target/role review and approval, run `npm run db:migrate --prefix backend` using the migration role. Then grant the backend role SELECT/INSERT/UPDATE/DELETE on the limiter table if it is not the owner. RLS is enabled; backend access requires ownership or BYPASSRLS plus table privileges. PUBLIC, anon and authenticated have no table grants. Preserve existing user/blog/session privileges and records.

The limiter atomically reserves PostgreSQL slots before password hashing. Limits are 10 failed/in-flight attempts per IP and route per 15 minutes and 30 per normalized login email across IPs. Successes release their reservations; failures and interrupted requests retain theirs until expiry. Account limits can temporarily lock out a targeted account, so monitor aggregate 429 counts. Keys are HMAC hashes; raw emails, IPs, passwords and tokens are not stored in the limiter table. All instances must share the same database and signing secret. Database outages return 503, never bypass throttling. A successful-response release failure conservatively retains the slot until expiration.

Schedule this maintenance SQL using your approved database scheduler (not automatically installed):

```sql
DELETE FROM auth_rate_limits WHERE reset_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP;
```

Expired windows reset atomically even before cleanup. Regular cleanup limits storage growth from distinct attacker identities. Apply edge request/connection limits too: CSRF rejection and public reads do not consume authentication counters. PostgreSQL pool capacity is per instance (10), so size instances against the provider's connection limit.

## TLS, health and logging

Certificate and hostname verification remain enforced even when URL SSL options request weaker checks. Remote plaintext is rejected; production startup also forbids PGSSLMODE=disable. The included Supabase CA expires April 26, 2031; rotate when the provider rotates certificates. NODE_EXTRA_CA_CERTS must be exported before Node starts; PGSSLROOTCERT is explicitly loaded from configuration.

GET `/api/health/live` returns only `{ success: true, status: "ok" }` without database access. GET `/api/health/ready` and the existing `/api/health` alias perform a database check and return minimal ready/503 unavailable responses. Provider, version, credentials, schema and query details are not exposed. Probes are uncached; restrict internal probe access at your edge as appropriate.

Runtime unexpected errors use allowlisted JSON event names only. No raw Error object, stack, SQL, URL, request body, Authorization or Cookie headers are logged. Startup/pool/limiter failures use the same logger. Unknown routes no longer echo query strings. Configure your proxy, APM and platform log collector to avoid capturing bodies, cookies, query strings or database URLs; application logging cannot control an external collector. Use restricted log access/retention and aggregate metrics without credential labels.

## Verification

Run `npm test --prefix backend`, `npm run lint` and `npm run build`. For real database tests supply a dedicated `TEST_DATABASE_URL` and `TEST_PGSSLMODE=disable` only for loopback PostgreSQL. The fixture creates temporary schemas and applies both migrations, then removes them. `tests/browser.mjs` accepts the same variables and an installed Playwright/Chromium.

Production tests cover rejected plaintext requests, trusted/untrusted forwarded headers, secure cookie attributes, CORS/CSRF, minimal probes, fail-closed limiter outages, safe logging and startup validation. Shared-store tests use independent database connections and concurrent reservations, check exact admission limits, released successes, expired windows and stale releases. Existing authentication/ownership, TLS, migration and browser suites remain in place.
