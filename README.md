# Artikly

**Every idea deserves a story.**

Artikly is a creative writing and digital publishing platform: a simple, welcoming space to share ideas, publish articles and discover perspectives from other writers. It was built for the Datheon Full-Stack Development Internship.

- **Frontend:** React 19 + Vite 8 (this folder)
- **Backend:** Node.js + Express 5 REST API ([`backend/`](backend/), see [backend/README.md](backend/README.md))
- **Database:** MariaDB / MySQL (developed on XAMPP's MariaDB 10.4)

## Features

**Reading**
- Homepage with search, article categories, Featured Stories and Latest Stories
- Search and category filters kept in the URL (`/?q=react&category=Design`)
- Article pages with author, date, reading time and related stories
- Responsive from 320px phones to wide desktops, with a mobile navigation menu

**Writing**
- Registration with validation and bcrypt password hashing (cost factor 12)
- Login with JWT authentication (HS256, 1-day expiry)
- Creator Dashboard with article statistics and status filters
- Editor with Write/Preview modes, categories and cover images (URL or preset)
- Save drafts (title only) or publish (requires description, category and at least 50 words)
- Edit, unpublish and delete articles, with confirmation dialogs and an unsaved-changes warning

**Security**
- Passwords hashed with bcrypt and never returned by the API or stored in the browser
- Parameterized SQL queries throughout
- Ownership enforced on the server: writers can only change their own articles, and drafts are private
- Login doesn't reveal which emails are registered, and failed attempts are rate-limited per IP
- Expired or invalid tokens log the user out automatically

## Quick start

### 1. Database (XAMPP)

```bash
sudo /opt/lampp/lampp startmysql
```

Create the `artikly_db` database and an `artikly_user` account with privileges on `artikly_db` only (for example in DBeaver).

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in DB_PASSWORD and a random JWT_SECRET
npm run db:test           # check the database connection
npm run db:migrate        # create tables (safe to re-run)
npm run db:seed           # demo account + sample articles (safe to re-run)
npm run dev               # http://localhost:5000/api
```

### 3. Frontend

In a second terminal, from the project root:

```bash
npm install
npm run dev               # http://localhost:5173
```

In development, Vite forwards `/api/*` to the backend at `http://localhost:5000`, so no CORS setup is needed whatever port Vite uses. To use a different backend address, start Vite with `API_PROXY_TARGET=http://localhost:5001 npm run dev`, or set `VITE_API_URL` (see `.env.example`).

### Demo account

| Email              | Password     |
| ------------------ | ------------ |
| `demo@artikly.dev` | `artikly123` |

Created by `npm run db:seed`. The Login page has a **Use demo account** button.

## Commands

| Where      | Command              | What it does                          |
| ---------- | -------------------- | ------------------------------------- |
| `/`        | `npm run dev`        | Frontend dev server                   |
| `/`        | `npm run build`      | Production build into `dist/`         |
| `/`        | `npm run preview`    | Serve the build (also proxies `/api`) |
| `/`        | `npm run lint`       | ESLint for frontend **and** backend   |
| `backend/` | `npm run dev`        | API with auto-restart (nodemon)       |
| `backend/` | `npm start`          | API without auto-restart              |
| `backend/` | `npm run db:test`    | Check the database connection         |
| `backend/` | `npm run db:migrate` | Apply `database/schema.sql`           |
| `backend/` | `npm run db:seed`    | Insert demo user and sample articles  |

## Frontend routes

| Route            | Page              | Access                                |
| ---------------- | ----------------- | ------------------------------------- |
| `/`              | Home              | Public                                |
| `/blog/:id`      | Article           | Public (drafts: author only)          |
| `/login`         | Log in            | Guests only                           |
| `/register`      | Create an account | Guests only                           |
| `/dashboard`     | Creator Dashboard | Logged-in users                       |
| `/create-blog`   | Write an Article  | Logged-in users                       |
| `/edit-blog/:id` | Edit Article      | Logged-in users (own articles only)   |
| `*`              | 404 Not Found     | Public                                |

## API overview

| Method | Endpoint             | Auth     | Purpose                         |
| ------ | -------------------- | -------- | ------------------------------- |
| GET    | `/api/health`        | –        | API and database status         |
| POST   | `/api/auth/register` | –        | Create an account               |
| POST   | `/api/auth/login`    | –        | Log in and receive a JWT        |
| GET    | `/api/auth/me`       | Bearer   | Current user                    |
| GET    | `/api/blogs`         | –        | Published articles              |
| GET    | `/api/blogs/mine`    | Bearer   | The current user's articles     |
| GET    | `/api/blogs/:id`     | Optional | One article (drafts: author only) |
| POST   | `/api/blogs`         | Bearer   | Create a draft or publish       |
| PUT    | `/api/blogs/:id`     | Bearer   | Update (author only)            |
| DELETE | `/api/blogs/:id`     | Bearer   | Delete (author only)            |

Request and response details are in [backend/README.md](backend/README.md).

## Architecture

```text
React page ──► services/authService.js, blogService.js ──► services/apiClient.js ──fetch──►
  /api (Vite proxy) ──► Express routes ──► controllers ──► services ──► models ──► MariaDB
```

**Frontend (`src/`)**
- `pages/`, `components/` and `layouts/` contain the UI. They never call `fetch` or `localStorage` directly.
- `services/apiClient.js` is the only code that calls the API. It attaches the JWT, turns errors into readable messages, and fires a session-expired event on 401.
- `services/session.js` is the only code that stores the session (token and public user info) in `localStorage`.
- `context/AuthProvider.jsx` holds the logged-in user, checks the stored token on load, and logs out when the session expires.

**Backend (`backend/src/`)**: MVC style
- `routes/` map URLs to controllers and attach `requireAuth` or `optionalAuth`.
- `controllers/` handle HTTP only: read the request, call a service, send JSON.
- `services/` hold business rules: validation, hashing, tokens, ownership.
- `models/` contain parameterized SQL and map rows to API objects.
- `utils/AppError.js` carries expected errors (400/401/403/404/409), and a central error handler in `app.js` turns them into JSON.

## Project structure

```text
├── backend/
│   ├── database/
│   │   ├── schema.sql         Tables (also runnable in DBeaver)
│   │   └── seed/              Demo account, authors and sample articles
│   └── src/
│       ├── config/            env.js, db.js (connection pool), db.test.js
│       ├── controllers/       auth.controller.js, blog.controller.js
│       ├── database/          migrate.js, seed.js
│       ├── middleware/        auth.middleware.js, rateLimit.middleware.js
│       ├── models/            user.model.js, blog.model.js
│       ├── routes/            health, auth, blog routes
│       ├── services/          auth.service.js, blog.service.js
│       ├── utils/             AppError.js, jwt.js, validators.js
│       ├── app.js             Express app and error handling
│       └── server.js          Startup (config check, DB check, listen)
├── public/                    favicon.svg
├── src/
│   ├── components/  layouts/  pages/  context/  hooks/
│   ├── services/              apiClient.js, session.js, authService.js, blogService.js
│   ├── data/                  categories.js, users.js (demo credentials)
│   └── utils/                 validation, formatting, search, content parsing, storage
├── index.html
├── vite.config.js             React plugin + /api proxy
└── eslint.config.js           Browser rules for src/, Node rules for backend/
```

## Known limitations and next steps

- **Token storage.** The JWT is kept in `localStorage`, which scripts on the page can read. The app never renders user content as HTML, which limits the XSS risk. HTTP-only cookies would be stronger.
- **No logout on the server or token refresh.** Logging out deletes the token in the browser, but a copied token stays valid until it expires (1 day).
- **The rate limiter keeps counts in memory**, so they reset on restart and aren't shared between server instances. A shared store such as Redis would be needed for production.
- **No HTTPS, security headers (e.g. `helmet`) or production deployment configuration yet.**
- **Search and filtering run in the browser** over all published articles. Server-side search and pagination would be needed at larger scale.
- **Cover images are URLs only**; uploads aren't supported.
