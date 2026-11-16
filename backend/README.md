# Artikly API

Express 5 and PostgreSQL/Supabase. Routes → controllers → services → parameterized SQL models. MySQL configuration and `database/schema.sql` remain available only for the legacy import script; the running API, migration and seed use PostgreSQL.

## Setup

From `backend/`:

```bash
npm install
cp .env.example .env    # configure DATABASE_URL and a generated SESSION_SECRET
npm run db:test
npm run db:migrate
npm run dev
```

`npm run db:migrate` applies `database/postgres.sql` in a transaction. It creates missing tables/indexes and adds `user_sessions` without changing existing accounts or blogs. It is safe to re-run. Row-level security is enabled for all three tables; PUBLIC and existing Supabase anon/authenticated table privileges are revoked: Supabase anon/authenticated roles cannot bypass Express to retrieve password hashes, session rows or drafts. The connection account needs schema/table creation privileges for migration; the server connection must use a backend-only role that owns these tables or has BYPASSRLS plus the necessary table privileges. Never ship this connection string to the browser. `npm run db:seed` optionally inserts the existing development demo data; never seed a public production installation with demo credentials.

Existing users retain their bcrypt passwords and blogs. Existing browser JWTs are discarded and users sign in again after this upgrade.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, required |
| `SESSION_SECRET` | Random secret of at least 32 characters, required for CSRF signing; existing `JWT_SECRET` is accepted temporarily as a migration fallback |
| `SESSION_TTL_HOURS` | Absolute session lifetime, default 24 hours, greater than 0 and at most 720 |
| `NODE_ENV` | Set to `production` for Secure cookies, host-prefixed cookie names and HSTS |
| `FRONTEND_URL` | Exact allowed browser origins, comma-separated; default `http://localhost:5173` |
| `PORT` | API port, default 5000 |
| `PGSSLMODE` | `disable` for a local database; otherwise verified TLS is enabled |
| `PGSSLROOTCERT` | CA certificate path, relative to backend/ or absolute. For Supabase: `certs/supabase-root-2021.crt` |
| `NODE_EXTRA_CA_CERTS` | Alternative CA bundle; export before starting Node (setting this only in dotenv does not update Node’s trust store) |
| `TEST_PGSSLMODE` | TLS mode for the test database independently of the application database; `disable` is allowed only on loopback |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy hop count, default 0; configure to match your deployment so rate limits use the actual client IP |
| `TEST_DATABASE_URL` | Optional test database; tests create and remove a random schema and never migrate application data |

Use HTTPS in production and serve the frontend/API from the same origin (or same site with credentialed CORS). Cross-site cookie hosting is intentionally unsupported. Include the actual Vite origin in `FRONTEND_URL` if Vite selects a different port. Configure the production web server to return `index.html` for React routes, proxy `/api` to Express, and use `Cache-Control: no-store` for the application HTML. Keep CDN caches disabled for authenticated API responses.

## Authentication flow

1. Before a mutation, call `GET /api/auth/csrf` with cookies enabled. Keep the returned `csrfToken` in memory and send it as `X-CSRF-Token`. It is signed, expires in one hour and is bound to the current session cookie. Anonymous login and registration are protected too. The server rejects untrusted Origins and cross-site mutation requests.
2. Register, then log in. Passwords use bcrypt cost 12; passwords are 8+ characters with a letter and number, at most 72 UTF-8 bytes. Email addresses are trimmed and normalized to lowercase.
3. Login generates a random 256-bit opaque session ID and stores only its SHA-256 hash in PostgreSQL. The response sets an HttpOnly, SameSite=Lax cookie, with Secure and `__Host-` names in production. No authentication token appears in JSON or browser storage. Login rotates and revokes any previous session cookie.
4. After login fetch a new CSRF value, since the session changed. Send cookies on all calls (`credentials: 'include'`). `GET /api/auth/me` restores the session on refresh; protected routes wait for that check.
5. Every private API request verifies session existence and expiration and loads the current user. Blog queries and writes derive ownership exclusively from that user; client IDs are ignored.
6. Logout deletes the current session row and clears cookies. Password changes require the current password and atomically update the hash and revoke **all** account sessions, including the current one. All devices must sign in again.

All API responses use `Cache-Control: no-store`. The frontend removes protected content on logout, synchronizes tabs through BroadcastChannel, and rechecks sessions before restoring protected pages from BFCache.

The cookie/CSRF design follows [OWASP session management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Contract

Success: `{ "success": true, "message"?: "...", "data"?: { ... } }`.

Error: `{ "success": false, "message": "...", "errors"?: { "field": "..." } }`.

A public user contains **only** `{ id, name, email, createdAt }`. IDs are serialized as strings to preserve PostgreSQL BIGINT precision. Password hashes, session hashes and cookies are never returned as user data.

Every POST, PUT, PATCH and DELETE below requires `X-CSRF-Token` plus matching cookies. Authentication in this table means a valid session cookie, not a bearer token.

| Method | Endpoint | Authentication | Input / result |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API/database status |
| GET | `/api/auth/csrf` | Public | `{ data: { csrfToken } }`; sets HttpOnly CSRF cookie |
| POST | `/api/auth/register` | Public | `{ fullName, email, password, confirmPassword }` → 201 `{ data: { user } }`; does not log in |
| POST | `/api/auth/login` | Public | `{ email, password }` → `{ data: { user, expiresAt } }`; sets session cookie |
| GET | `/api/auth/me` | Required | `{ data: { user } }` |
| POST | `/api/auth/logout` | Cookie if present | No body; invalidates current session; idempotent |
| PATCH | `/api/auth/profile` | Required | `{ fullName, email, currentPassword? }` → `{ data: { user } }`; current password required to change email |
| PUT | `/api/auth/password` | Required | `{ currentPassword, password, confirmPassword }`; revokes all sessions |
| GET | `/api/blogs` | Public | Published articles only → `{ data: { blogs } }` |
| GET | `/api/blogs/mine` | Required | All current user's blogs, most recently updated first → `{ data: { blogs } }` |
| GET | `/api/blogs/:id` | Optional | `{ data: { blog } }`; drafts return 404 unless owned |
| POST | `/api/blogs` | Required | Article body → 201 `{ data: { blog } }` |
| PUT | `/api/blogs/:id` | Required, owner | Article body → `{ data: { blog } }` |
| DELETE | `/api/blogs/:id` | Required, owner | Removes the article |

Profile updates require a full name of 2–255 characters and valid email of at most 255 characters. Email uniqueness is enforced by the database; changing someone else's profile via a body/query ID is unsupported and ignored.

Article body: `{ title, excerpt, content, category, coverImage, status }`. Drafts require a title of 5–120 characters. Publishing also requires an excerpt of 20–220 characters, 50+ words, and a category from Development, Design, Career, Productivity, Technology, Lifestyle. Content is capped at 100,000 characters; optional cover images must be HTTP(S) URLs up to 2048 characters. Ownership and `featured` cannot be supplied by clients. Publishing preserves an existing publication date; unpublishing clears it. User content is rendered as escaped React text, never injected as HTML.

| Status | Meaning |
| --- | --- |
| 400 | Invalid fields/JSON, incorrect current password |
| 401 | Invalid credentials or missing/expired/revoked session |
| 403 | CSRF/origin rejection or attempted modification of another user's article |
| 404 | Missing article; private drafts are hidden from other viewers |
| 409 | Email already used |
| 413 | Request over 1 MB |
| 429 | Failed-attempt limit exceeded; `Retry-After` provided |
| 500 | Generic server error; internal details stay on the server |

Login, registration, profile and password endpoints allow 10 failed or in-flight attempts per IP and route within 15 minutes. Successes release their slot. Limits are process-local; use a shared limiter at the edge or a shared store for multiple instances. Expired session rows are cleaned on subsequent logins; schedule `DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP` if idle-session retention matters. Session IDs always expire at their stored deadline even before cleanup.

## Verification

```bash
# From the repository root:
npm test --prefix backend
npm run lint
npm run build

# Same API suite against a real PostgreSQL TEST database (needs CREATE SCHEMA):
TEST_DATABASE_URL='postgresql://...' npm test --prefix backend
# For a local test server only, set TEST_PGSSLMODE=disable.
```

The default suite runs real Express handlers, services, bcrypt hashing and model calls against an in-memory repository double. It covers registration/login, validation, cookie persistence, CSRF, private API access, expiration, revocation, ownership filtering, cross-user requests, blog CRUD, profile/password changes, logout replay and rate limiting. The production cookie test checks Secure, HttpOnly, SameSite and host-only scope. These offline tests do not validate PostgreSQL syntax or locking. Setting `TEST_DATABASE_URL` runs the same HTTP tests against actual SQL in a random schema, then drops that schema.

Optional browser checks from the repository root:

```bash
npm install --no-save playwright-core
# Use an existing Chromium executable:
CHROMIUM_PATH=/path/to/chrome node tests/browser.mjs
# PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs can reuse an existing package.
```

The browser script starts temporary Vite/Express servers and tests registration, redirects, refresh, draft creation, profile editing, mobile layout, cross-tab logout, back navigation and password changes. It uses the offline repository double by default and also supports `TEST_DATABASE_URL`.

## PostgreSQL review verification

The configured Supabase connection was verified on November 16, 2026 using the public Supabase Root 2021 CA, downloaded over HTTPS from `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`. Its validity ends April 26, 2031; rotate it when the provider rotates certificates. The original DNS failure did not recur with network access; the remaining failure was `SELF_SIGNED_CERT_IN_CHAIN`, resolved by trusting the CA without disabling certificate/hostname verification. See [Supabase SSL documentation](https://supabase.com/docs/guides/platform/ssl-enforcement).

Environment loading is anchored to backend/.env regardless of the invoking directory. `PGSSLROOTCERT` is explicitly read by the driver configuration; URL SSL options cannot turn off verification. The ignored local backend/.env now points to the bundled public CA. Credentials were not changed or printed.

The migration runner uses one transaction, a public schema search path, a ten-second lock timeout and full-row checksum checks under write-blocking table locks. It rejects missing required columns and rolls back on errors or changed user/blog rows. The migration was committed on the configured Supabase database with all 7 users and 10 blogs preserved.

Real HTTP tests and Chromium checks were run against PostgreSQL 17 in a disposable loopback-only database, each using an isolated random schema. No registration/login test data was written to Supabase.

## Production security update

See [deployment preparation](../deploy/PRODUCTION.md). The process-local limiter description above is superseded by PostgreSQL-backed shared counters (10 per IP/route and 30 per login email per 15 minutes; failures/in-flight requests). The guarded migration runner additionally applies `database/migrations/002-auth-rate-limits.sql`. This new migration is pending approval for the live database. Authentication fails closed with 503 if limiter storage is unavailable. Runtime error logging is allowlisted and excludes raw request/error contents. GET health/live is a minimal liveness probe; health/ready and health are minimal readiness probes. Production requires HTTPS requests through explicitly trusted proxies; cookie and database TLS verification remain enforced.
