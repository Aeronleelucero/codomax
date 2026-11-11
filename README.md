# Codomax — Responsive Blog Application

A responsive blogging frontend built with **React 19**, **Vite** and **React Router**, as part of the Datheon Full-Stack Development Internship.

Visitors can browse, search and read articles. Registered users can log in, write posts in an editor, save drafts, publish, edit and delete their own posts from a dashboard.

> **Frontend stage:** authentication and data are **mocked** and stored in your browser's `localStorage`. Nothing is sent to a server, and passwords are **not** secured. Don't use a real password.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run lint      # ESLint
npm run build     # production build in dist/
npm run preview   # serve the production build
```

**Demo account:** `demo@codomax.dev` / `codomax123` (the Login page also has a "Use demo account" button).

To reset all data, clear the site's local storage (DevTools → Application → Local Storage) and reload the page.

## Routes

| Route            | Page                         | Access                                  |
| ---------------- | ---------------------------- | --------------------------------------- |
| `/`              | Home (featured, latest, search) | Public                               |
| `/blog/:id`      | Article page                 | Public (drafts: author only)            |
| `/login`         | Login                        | Guests only (logged-in users → dashboard) |
| `/register`      | Register                     | Guests only                             |
| `/dashboard`     | Dashboard                    | Logged-in users                         |
| `/create-blog`   | Create Blog                  | Logged-in users                         |
| `/edit-blog/:id` | Create Blog in edit mode     | Logged-in users (own posts only)        |
| `*`              | 404 page                     | Public                                  |

Visitors who aren't logged in and open a protected page are sent to `/login`, then returned to that page after logging in.

## Project structure

```text
src/
├── components/      Reusable UI: Navbar, Footer, BlogCard, Button, FormField,
│                    PasswordField, ConfirmDialog, ToastStack, BlogForm,
│                    ProtectedRoute, GuestRoute, …  (each with its own .css)
├── layouts/         MainLayout (navbar + footer), DashboardLayout (sidebar)
├── pages/           Home, Login, Register, Dashboard, CreateBlog, BlogDetail, NotFound
├── context/         AuthContext + AuthProvider, ToastContext + ToastProvider
├── hooks/           useAuth, useToast, useFormState
├── services/        authService, blogService  ← the only files that touch storage
├── data/            Seed articles, demo user, categories
├── utils/           validation, formatting, search, content parsing, storage helpers
├── App.jsx          Route definitions only
├── App.css          Shared layout styles (sections, badges, chips, page states)
└── index.css        Design tokens, reset and base typography
```

## Key decisions

- **Service layer for future backend integration.** Pages never read `localStorage` directly; they call async functions in `src/services/`. Each function already returns a Promise and has the target REST endpoint written in a comment, so connecting the backend means replacing the function bodies with `fetch` calls. The components don't change.
- **Context split into three files** (`AuthContext.js`, `AuthProvider.jsx`, `useAuth.js`). Vite's Fast Refresh, enforced by the `react-refresh` ESLint rule, needs component files to export only components.
- **Validation as pure functions** in `utils/validation.js`. Errors are derived from the current values on every render, shown after a field is left or the form is submitted, and linked to inputs with `aria-describedby`. On a failed submit, focus moves to the first invalid field.
- **Draft vs. publish rules.** A draft only needs a title. Publishing also requires a description, a category and at least 50 words.
- **Search state in the URL** (`/?q=react&category=Design`), so results can be shared and the Back button works.
- **Simple, safe content format.** A blank line starts a new paragraph, `## ` makes a heading and `- ` makes a list item. Text is rendered by React, never as raw HTML.
- **No extra dependencies.** Icons are inline SVGs, and the delete/discard confirmations use the native `<dialog>` element (built-in focus trap and Escape key).

## Next stage (backend)

1. Replace the bodies in `services/authService.js` and `services/blogService.js` with API calls.
2. Store a token (or rely on an HTTP-only cookie) instead of the mock session.
3. Move ownership checks and validation to the server (keep the client checks for UX).
