# Authentication and dashboard implementation report

Latest status: the [PostgreSQL integration review](#postgresql-integration-review) completed real database verification and applied the Supabase migration. The earlier offline results below are retained as history.

## Project analysis and decisions

The application already used React 19/Vite/React Router, Express 5, bcrypt, controller/service/model layers, reusable navy/lime UI components and ownership checks. Runtime models and startup connected to PostgreSQL/Supabase, while the database scripts and documentation still targeted MySQL. The implementation extends those layers and keeps public reading, editing, publishing, search and demo features.

Server-side sessions suit this first-party application because immediate logout and revocation are required. Stateless JWTs would need another persistent revocation mechanism. The upgrade replaces localStorage JWTs with random session cookies and a PostgreSQL session table, removes the unused JWT utility/package, and declares the already-used `pg` driver in the backend package. No new production framework or session dependency was added.

## Result

- Bcrypt cost 12, consistent validation including bcrypt's 72-byte limit, public user allowlisting and generic credential errors.
- Opaque 256-bit session cookies; only SHA-256 hashes persisted; absolute expiration, rotation, logout revocation and transactional all-device revocation after password changes.
- HttpOnly/SameSite cookies, production Secure/host-prefixed cookies, signed expiring session-bound CSRF values, origin checks, security/cache headers and failed/in-flight login throttling.
- Session restoration before protected routes render; intended destination through registration/login; synchronized tabs and BFCache revalidation.
- Existing server ownership checks preserved, author IDs derived from the session, BIGINT IDs serialized consistently as strings, and edit timestamps maintained.
- Dashboard statistics, recent posts with creation dates, a dedicated My Blogs page and existing working article CRUD actions.
- Profile name/email editing and current-password-gated password changes, using existing form controls and the existing initials avatar.
- PostgreSQL migration/seed tooling consistent with runtime, verified TLS by default, and RLS for backend-owned data to block direct Supabase browser-role access.

## Flow, endpoints and configuration

The full [API contract and authentication flow](backend/README.md) documents request/response shapes, authorization, errors, environment variables and production requirements. The [project README](README.md) contains setup and application/test commands. Copy [backend/.env.example](backend/.env.example) for configuration.

New endpoints are `GET /api/auth/csrf`, `POST /api/auth/logout`, `PATCH /api/auth/profile` and `PUT /api/auth/password`. Existing registration/login/current-user and blog endpoints now use cookies and CSRF instead of bearer tokens.

Before running, apply [backend/database/postgres.sql](backend/database/postgres.sql) with `npm run db:migrate --prefix backend`. It adds `user_sessions`, preserves existing users/blogs, and enables RLS on all three tables. Run migrations as a table owner. The backend connection must own the tables or have BYPASSRLS plus required privileges. PUBLIC and existing Supabase anon/authenticated table privileges are revoked; the migration grants no browser-role policies. Old browser JWTs are removed; users sign in again. Required environment settings are `DATABASE_URL` and a random `SESSION_SECRET` (32+ characters); configure `FRONTEND_URL` and HTTPS/production mode for your deployment. `SESSION_TTL_HOURS` defaults to 24. Legacy `JWT_SECRET` is accepted as a temporary fallback.

## Initial offline verification — November 16, 2026 (superseded below)

| Check | Result | What it establishes |
| --- | --- | --- |
| `npm test --prefix backend` | 18 passed, 0 failed | Real HTTP/Express/service/model flow with an in-memory repository double: registration, hashing, credentials, cookie persistence/attributes, private APIs, CSRF, expired/invalid sessions, session rotation, ownership filtering, cross-user viewing/editing/deletion rejection, owned CRUD, profile updates, password changes, logout/replay and rate limiting |
| Chromium `tests/browser.mjs` | 11 checks passed; no runtime errors | Login redirect, intended destination through registration, no readable/stored authentication token, refresh persistence, owned draft creation, profile edit, 375px layout, cross-tab logout, browser back after logout, and reauthentication with a changed password |
| `npm run build` | Passed | Production frontend compilation |
| `npm run lint` | Passed | Frontend/backend static checks |
| `git diff --check` | Passed | No whitespace errors |
| Live configured PostgreSQL | Unavailable (`EAI_AGAIN`) | Migration, SQL execution, locks and provider integration were not verified against the live database |

At the initial offline stage, no migration or seed had been applied to the configured database. `TEST_DATABASE_URL='postgresql://...' npm test --prefix backend` runs the HTTP suite against a random temporary schema on a reachable test database, then removes it. The optional browser script supports that variable too. Default tests never use application database records.

## Remaining limits

The failed-attempt limiter is process-local; multi-instance hosting needs a shared limiter. Production still needs HTTPS, the correct trusted proxy count, React fallback routing, and no-store HTML/CDN configuration. Profile photos use the existing initials avatar; uploads, password reset and email verification are outside this implementation. The subsequent integration review below verified the migration and Supabase browser-role restrictions. The legacy MySQL import utility is preserved.

## File inventory

### Created (18)

- `AUTHENTICATION.md`
- `backend/database/postgres.sql`
- `backend/certs/supabase-root-2021.crt`
- `backend/src/controllers/profile.controller.js`
- `backend/src/middleware/csrf.middleware.js`
- `backend/src/models/profile.model.js`
- `backend/src/models/session.model.js`
- `backend/src/services/profile.service.js`
- `backend/src/utils/cookies.js`
- `backend/tests/auth.test.js`
- `backend/tests/cookies.test.js`
- `backend/tests/postgres-config.test.js`
- `backend/tests/postgres.test.js`
- `backend/tests/support/fixture.js`
- `backend/tests/support/memoryPool.js`
- `src/pages/Profile.css`
- `src/pages/Profile.jsx`
- `tests/browser.mjs`

### Modified (34)

- `.gitignore`
- `README.md`
- `backend/.env.example`
- `backend/README.md`
- `backend/package-lock.json`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/config/env.js`
- `backend/src/config/postgres.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/database/migrate.js`
- `backend/src/database/seed.js`
- `backend/src/middleware/auth.middleware.js`
- `backend/src/middleware/rateLimit.middleware.js`
- `backend/src/models/blog.model.js`
- `backend/src/routes/auth.routes.js`
- `backend/src/services/auth.service.js`
- `backend/src/utils/validators.js`
- `src/App.jsx`
- `src/components/GuestRoute.jsx`
- `src/components/Navbar.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/context/AuthProvider.jsx`
- `src/layouts/DashboardLayout.jsx`
- `src/pages/BlogDetail.jsx`
- `src/pages/CreateBlog.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Login.jsx`
- `src/pages/Register.jsx`
- `src/services/apiClient.js`
- `src/services/authService.js`
- `src/services/blogService.js`
- `src/services/session.js`
- `src/utils/validation.js`

### Removed (1)

- `backend/src/utils/jwt.js`


## PostgreSQL integration review

Completed November 16, 2026. No authentication/UI redesign was needed.

### Diagnosis and fixes

With network access, the configured Supabase host resolved successfully. Actual connection attempts then failed with `SELF_SIGNED_CERT_IN_CHAIN`. Trusting the public Supabase Root 2021 CA resolved that error, and real SQL queries succeeded with certificate and hostname verification enabled. The public certificate was fetched over HTTPS from Supabase's download service and is stored in `backend/certs/supabase-root-2021.crt`; credentials were never printed or copied into tracked files.

`PGSSLROOTCERT` now supports absolute paths or paths relative to backend/. The ignored local backend/.env was updated with that CA path while keeping credentials unchanged. Environment loading is anchored to backend/.env rather than the invoking directory. The existing 128-character JWT_SECRET remains a valid fallback; SESSION_SECRET is not yet separately set. TEST_DATABASE_URL was absent, so tests used an explicitly supplied disposable local PostgreSQL 17 database rather than production records.

Driver configuration explicitly enforces certificate and hostname checks after parsing URL options, and rejects plaintext connections to remote hosts. Test TLS configuration uses TEST_PGSSLMODE independently of the application connection. Failed temporary-schema setup now closes connections and removes the schema.

The migration runner now uses a single transaction pinned to public, checks required existing columns, locks user/blog tables against concurrent writes, and compares full-row checksums before committing. It rolls back on failures or data changes.

### Applied migration and verified target

The configured Supabase database (`postgres`, public schema) was inspected read-only before migration. Its users/blogs columns matched the application schema, its role owned both tables and had BYPASSRLS, and both existing tables already had RLS enabled. The user_sessions table was pending.

After migration validation on the isolated database, the runner committed on Supabase. All **7 users and 10 blogs were preserved**, with unchanged full-row checksums. The session table exists and initially contains zero sessions. RLS is enabled on users, blogs and user_sessions. Both anon and authenticated lack SELECT/INSERT/UPDATE/DELETE privileges on all three tables; actual SELECT attempts under each role were rejected with PostgreSQL permission errors. No registration, login or browser test data was inserted into Supabase.

### Final results

| Check | Result | Database evidence |
| --- | --- | --- |
| Real PostgreSQL backend suite | 21 passed, 0 failed, 0 skipped | PostgreSQL 17, dedicated disposable database with random per-suite schemas; real SQL for all authentication, session, CSRF, profile, logout and ownership tests |
| Migration regression | Passed within the real suite | Exact row preservation, repeatable migration, RLS on all three tables, denied read/write privileges for Supabase-style roles |
| Browser suite | 11 passed; no runtime errors | Chromium + real Express + isolated PostgreSQL schema, including refresh, profile editing, cross-tab logout, history and changed-password login |
| Default backend suite | 20 passed, 1 intentionally skipped | In-memory repository; the PostgreSQL-only migration test skips without TEST_DATABASE_URL |
| Lint / production build / diff check | Passed | Local static/build checks |
| Supabase connection and migration | Succeeded | Actual verified-TLS queries, migration commit and subsequent RLS/role checks |

The disposable PostgreSQL container and its data were removed after verification. To repeat with your own separate test database:

```bash
TEST_DATABASE_URL='postgresql://...' TEST_PGSSLMODE=disable npm test --prefix backend
# TEST_PGSSLMODE=disable is for loopback databases only; use verified TLS remotely.
```

Remaining operational limits: configure HTTPS and proxy/cache settings for deployment, replace the process-local limiter for multiple instances, and rotate the provider CA before its April 26, 2031 expiry or when Supabase changes its CA. The bundled certificate and local configuration fix are working on this machine; other deployments must set PGSSLROOTCERT appropriately. Password reset, email verification and photo uploads remain outside this implementation.

## Production security preparation

This work was performed locally after the PostgreSQL integration review. **No live database queries, migrations, infrastructure modifications or deployments were performed in this production-preparation task.** The existing 7 users and 10 blogs were not touched. The prior Supabase migration status above remains historical; the new limiter migration is pending approval.

### Changes

- Production HTTPS enforcement uses Express's trusted proxy interpretation and rejects insecure application requests before cookie issuance or body parsing. Only minimal internal GET health probes may use HTTP. Added explicit proxy CIDRs, retained validated fixed-hop configuration, and added HTTPS origin/startup validation.
- Cookies retain Secure/HttpOnly/host-prefix/SameSite protections in production. Existing CSRF binding, origin checks, session deadlines and revocation remain unchanged. API responses now add restrictive CSP, permissions policy, no-referrer policy and HTTPS-only HSTS.
- Replaced per-process throttling with atomic PostgreSQL reservations, shared per-IP/route and per-login-account limits, successful-response releases and fail-closed 503 behavior. Bucket identities are HMAC hashes. Timestamp precision is preserved as database text so microseconds do not prevent successful slot releases.
- Added the additive `backend/database/migrations/002-auth-rate-limits.sql` migration, included in the guarded migration runner and isolated test fixture. It creates auth_rate_limits with RLS and browser-role access revoked; it does not change existing records. It has NOT been applied to Supabase.
- Added minimal liveness/readiness endpoints, generic readiness failures, allowlisted structured runtime error logs, safe pool/startup failure logging and non-reflective 404 responses.
- Added a production environment template and Nginx example with HTTPS, safe forwarding-header overwrites, frontend CSP and SPA fallback. These configuration examples have not been deployed or validated against an installed Nginx.

### Verification

- Real PostgreSQL backend suite: **29 passed, 0 failed, 0 skipped**, including production security tests, independent shared-counter clients, concurrency, expiry, successful-slot release, RLS and denied browser-role reads of the limiter table. The test database was a disposable local PostgreSQL 17 database; application data was never accessed.
- Default suite: **28 passed, 1 PostgreSQL-only test intentionally skipped**.
- Existing Chromium browser suite against an isolated real PostgreSQL schema: **11 passed**, no runtime errors.
- Lint, production build and whitespace checks passed. Database TLS certificate and hostname enforcement regression tests passed. The production proxy behavior tests simulate trusted/untrusted forwarding over loopback; they do not establish actual edge certificate provisioning or firewall rules.

### Deployment requirements and risks

See [deploy/PRODUCTION.md](deploy/PRODUCTION.md) for configuration, approval-dependent migration steps, database maintenance and verification commands. The new backend fails authentication closed until the approved limiter migration exists. All instances must share the database and signing secret. Restrict backend access to trusted proxies and overwrite forwarding headers. Deployments need valid HTTPS certificates, the appropriate CA configuration, secret-manager values and session/limiter cleanup scheduling. Review existing seeded demo accounts before a public launch; no account/password changes were made here. Distributed account throttling can temporarily lock out an account under attack. Monitor safe aggregate metrics, edge request limits, limiter-table growth and database connection capacity. External proxy/APM logs must also exclude credentials.

New files for this step: backend/.env.production.example, backend/database/migrations/002-auth-rate-limits.sql, backend/src/middleware/security.middleware.js, backend/src/models/rateLimit.model.js, backend/src/utils/logger.js, backend/tests/production.test.js, backend/tests/rateLimit.test.js, deploy/PRODUCTION.md and deploy/nginx.conf.example.
