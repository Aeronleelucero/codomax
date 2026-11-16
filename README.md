# Artikly

**Every idea deserves a story.**

Artikly is a blogging application built with React 19, Vite 8, React Router 7, Express 5 and PostgreSQL/Supabase. The existing navy/lime theme, reading experience and article editor are preserved.

## Features

- Public articles, category/search filters, featured stories and related articles.
- Registration and login with bcrypt cost 12 and validation.
- PostgreSQL-backed sessions in HttpOnly cookies; Secure host-prefixed cookies in production, SameSite=Lax, absolute expiry and server-side revocation.
- Signed, session-bound CSRF tokens and per-IP failed-attempt limits.
- Protected creator dashboard with total/published/draft statistics, recent articles and creation dates.
- My Blogs at `/dashboard/blogs`, with status filtering, draft preview, editing and confirmed deletion.
- Full article editor with preview, categories, image URLs/presets, draft saving and publishing validation.
- Profile settings at `/dashboard/profile`: edit name/email and change passwords after verifying the current password. The existing initials avatar follows the user's name.
- Server-side blog ownership and private draft enforcement; body/query IDs never determine ownership.
- Refresh persistence, intended login destinations, logout to `/login`, tab synchronization and revalidation on browser history restoration.
- Responsive layouts, accessible fields, loading/empty/error states and toast notifications.

## Quick start

Use a PostgreSQL database or your existing Supabase database. No MySQL service is needed for normal operation.

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL, SESSION_SECRET and FRONTEND_URL in .env.
# Remove PGSSLMODE=disable when using Supabase/production.
npm run db:test
npm run db:migrate
npm run dev                 # http://localhost:5000/api
```

In another terminal:

```bash
# Repository root
npm install
npm run dev                 # http://localhost:5173
```

Vite proxies `/api` to the backend. Use `API_PROXY_TARGET=http://localhost:5001 npm run dev` for another backend port. Include the actual browser origin in `FRONTEND_URL` if Vite selects another port. For production, serve React and `/api` on the same site over HTTPS; set `NODE_ENV=production`. The frontend HTML should be served with `Cache-Control: no-store` and React route fallback enabled.

Optional `npm run db:seed` from `backend/` adds the existing demo account and sample articles without overwriting existing data. The Login page's demo action is retained. Keep seeded demo accounts out of publicly accessible production installations.

## Authentication and database upgrade

The app now uses opaque server-side sessions instead of browser-stored JWTs. On login the server sets a random session cookie and stores only its hash in `user_sessions`. Every private API request loads the verified user from PostgreSQL. React checks `/api/auth/me` on startup before rendering protected pages, so refreshes retain login without trusting cached user data.

Mutating requests first obtain an in-memory CSRF value from `/api/auth/csrf`, then send it with the HttpOnly cookies. Logout deletes the server session. A password change atomically updates the bcrypt hash and deletes all sessions for that account. This cookie design follows [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Run `npm run db:migrate` in `backend/` before starting this version. The additive PostgreSQL migration in `backend/database/postgres.sql` creates missing tables and session indexes without removing existing users or blogs. It also enables row-level security to deny direct Supabase browser-role access; the Express database role must own the tables or have BYPASSRLS and the required table privileges. Existing passwords remain valid; previous JWT users must log in again. `SESSION_SECRET` replaces `JWT_SECRET` (the old name is temporarily supported as a fallback). `JWT_EXPIRES_IN` is no longer used. Sessions expire after `SESSION_TTL_HOURS`, default 24.

The previous MySQL schema and import script are retained for legacy migration use. The runtime models, database check, schema migration and seed now consistently target PostgreSQL. PostgreSQL TLS certificates are verified by default; local databases can use `PGSSLMODE=disable`. Use `PGSSLROOTCERT` for a provider CA, or export `NODE_EXTRA_CA_CERTS` before starting Node.

## Routes

| Route | Access |
| --- | --- |
| `/` | Public article listing |
| `/blog/:id` | Public for published articles; author only for drafts |
| `/login`, `/register` | Guests |
| `/dashboard` | Authenticated overview and recent posts |
| `/dashboard/blogs` | Authenticated user's blogs |
| `/dashboard/profile` | Authenticated user's profile/password settings |
| `/create-blog` | Authenticated editor |
| `/edit-blog/:id` | Authenticated owner only |

Private APIs enforce authentication independently of React guards. See [backend/README.md](backend/README.md) for the full endpoint contract, request/response shapes, environment variables and deployment requirements.

New API routes: `GET /api/auth/csrf`, `POST /api/auth/logout`, `PATCH /api/auth/profile`, `PUT /api/auth/password`. Existing auth/blog routes now use session cookies and CSRF protection rather than bearer tokens. IDs are returned as strings to preserve PostgreSQL BIGINT precision.

## Commands and verification

```bash
npm run dev                   # frontend
npm run build                 # production frontend build
npm run preview               # serve frontend build
npm run lint                  # frontend and backend ESLint
npm test --prefix backend     # API security/ownership regression suite
npm run dev --prefix backend  # API with auto-restart
npm start --prefix backend    # API
npm run db:test --prefix backend
npm run db:migrate --prefix backend
```

The default API suite uses real HTTP, Express, bcrypt and application code with an in-memory repository double; it does not connect to the configured application database. To verify actual PostgreSQL queries and migration behavior in a temporary schema:

```bash
TEST_DATABASE_URL='postgresql://...' npm test --prefix backend
```

Use a dedicated test database with schema creation permission. For local PostgreSQL also set `TEST_PGSSLMODE=disable`. Optional Chromium tests are in `tests/browser.mjs`; setup and commands are documented in [backend/README.md](backend/README.md#verification).

## Architecture

```text
React pages/components → services/apiClient.js (cookies + CSRF)
  → Express routes → controllers → services → SQL models → PostgreSQL
```

Authentication state stays in React memory. Browser storage is only read to delete obsolete localStorage sessions and legacy mock data. Password hashes and session secrets never appear in API user responses. Blog content is rendered as React text instead of injected HTML.

## Current limits

- Rate limits are in memory per API process. Use a shared edge limiter or store for multi-instance deployments.
- Profile images use the existing initials avatar; image uploads are not implemented.
- Profile email changes require the current password, but there is no email-verification or password-reset service.
- Public search/filtering runs in the browser; pagination can be added for larger datasets.
- Production HTTPS, reverse proxy routing, trusted proxy count and cache headers must be configured by the deployment.
- Real PostgreSQL tests require `TEST_DATABASE_URL`; use `TEST_PGSSLMODE=disable` for a local test server. The integration review verified PostgreSQL 17 tests and the Supabase migration; see AUTHENTICATION.md.

Full implementation decisions, verification results and the complete changed-file inventory are in [AUTHENTICATION.md](AUTHENTICATION.md).

The PostgreSQL integration review resolved certificate trust using `PGSSLROOTCERT=certs/supabase-root-2021.crt`, verified the configured Supabase connection and applied the migration with existing records preserved. See [the updated verification report](AUTHENTICATION.md#postgresql-integration-review).

Production security configuration and the **pending shared-limiter migration** are documented in [deploy/PRODUCTION.md](deploy/PRODUCTION.md). The new backend requires that migration before rollout; live changes require approval.
