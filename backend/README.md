# Artikly API

Express 5 + MariaDB/MySQL REST API for Artikly. For setup steps, see the [project README](../README.md#quick-start).

## Environment (`backend/.env`)

| Variable         | Example                 | Notes                                                |
| ---------------- | ----------------------- | ---------------------------------------------------- |
| `PORT`           | `5000`                  |                                                      |
| `FRONTEND_URL`   | `http://localhost:5173` | Allowed CORS origin(s), comma-separated              |
| `DB_HOST`        | `127.0.0.1`             |                                                      |
| `DB_PORT`        | `3306`                  |                                                      |
| `DB_USER`        | `artikly_user`          | Needs privileges on `artikly_db` only                |
| `DB_PASSWORD`    |                         | Never commit                                         |
| `DB_NAME`        | `artikly_db`            |                                                      |
| `JWT_SECRET`     |                         | Random, at least 32 characters; the server won't start otherwise |
| `JWT_EXPIRES_IN` | `1d`                    |                                                      |

## Response format

Success: `{ "success": true, "message"?: string, "data": { ... } }`

Error: `{ "success": false, "message": string, "errors"?: { field: message } }`

| Status | Meaning                                                    |
| ------ | ---------------------------------------------------------- |
| 400    | Validation failed (see `errors`) or invalid JSON            |
| 401    | Not logged in, wrong credentials, or expired/invalid token  |
| 403    | Logged in, but the article belongs to someone else          |
| 404    | Not found (drafts appear as 404 to anyone but their author) |
| 409    | Email already registered                                    |
| 413    | Request body larger than 1 MB                               |
| 429    | Too many failed login/register attempts (see `Retry-After`) |
| 500    | Unexpected error (details are only logged on the server)    |

## Authentication

```http
POST /api/auth/register
Content-Type: application/json

{ "fullName": "Alex Morgan", "email": "alex@example.com", "password": "secret123", "confirmPassword": "secret123" }
```
→ `201 { data: { user: { id, name, email, createdAt } } }`

Rules: full name of at least 2 characters, a valid email (stored lowercase), and a password of 8–72 characters containing a letter and a number.

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "alex@example.com", "password": "secret123" }
```
→ `200 { data: { user, token, expiresAt } }`

Send the token on protected requests:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Login and register allow 10 **failed** attempts per IP per 15 minutes. Successful requests don't count.

## Articles

An article object:

```json
{
  "id": 12, "title": "…", "excerpt": "…", "content": "…", "category": "Design",
  "coverImage": "https://…", "status": "published", "featured": false,
  "authorId": 3, "authorName": "Elena Petrova",
  "createdAt": "2026-11-01T12:00:00.000Z", "updatedAt": "…", "publishedAt": "…"
}
```

| Method & path            | Auth     | Notes                                               |
| ------------------------ | -------- | --------------------------------------------------- |
| `GET /api/blogs`         | –        | Published only, newest first → `{ blogs }`          |
| `GET /api/blogs/mine`    | Bearer   | Drafts and published, recently edited first → `{ blogs }` |
| `GET /api/blogs/:id`     | Optional | `{ blog }`; drafts only for their author            |
| `POST /api/blogs`        | Bearer   | `201 { blog }`                                      |
| `PUT /api/blogs/:id`     | Bearer   | Author only → `{ blog }`                            |
| `DELETE /api/blogs/:id`  | Bearer   | Author only                                         |

Body for `POST` and `PUT`: `{ title, excerpt, content, category, coverImage, status }`

- `status: "draft"` (the default) needs only a title of 5–120 characters.
- `status: "published"` also needs a description of 20–220 characters, at least 50 words of content, and a `category` from: Development, Design, Career, Productivity, Technology, Lifestyle.
- `coverImage` is optional and must be an `http(s)` URL.
- The author always comes from the token. `featured` can't be set by clients.
- Publishing sets `publishedAt` once; editing a live article keeps it, and unpublishing clears it.

## Database

`database/schema.sql` defines `users` and `blogs`. `blogs.author_id` references `users.id` with `ON DELETE CASCADE`. All times are stored and returned in UTC.

```bash
npm run db:migrate   # CREATE TABLE IF NOT EXISTS ... (never drops data)
npm run db:seed      # demo@artikly.dev / artikly123 + 10 sample articles (skips existing)
```
