# Login Page

## Page Overview

| | |
|---|---|
| **Route** | `/login` |
| **Component** | [`src/components/Login.tsx`](../../src/components/Login.tsx), [`src/components/auth/LoginFormCard.tsx`](../../src/components/auth/LoginFormCard.tsx) |
| **Sidebar label** | — (public page, no sidebar) |
| **Page heading** | Uppercase `systemName` (`h1` in card); optional `logoUrl` |

The login page is the public entry point for unauthenticated users. It uses a VAHANPLUS-inspired single centered card on a mesh background at all screen sizes. Already-authenticated users are redirected to their prior destination or `/dashboard`.

---

## User Guide

### What You See

- **Layout** — One centered card (`max-w-[400px]`), never full viewport width
- **Background** — Mesh with soft purple/teal aurora blobs (adapts to light/dark)
- **Card header** — Centered logo with glow, uppercase brand name, “Sign in to continue”
- **Form** — Uppercase labels (Email address, Password), filled inputs, full-width Sign in button
- **Theme** — Follows OS light/dark preference automatically (no toggle on login)
- **Footer** — “Secure multi-tenant workspace” below the card

### Key Actions

1. Enter your company email address and password
2. Click **Sign in**
3. On success, you are redirected to the dashboard (or the page you tried to visit before login)
4. On failure, an error toast appears (invalid credentials, deactivated account, or inactive company)

### Role-Based Differences

All roles use the same login form. Post-login navigation and visible sidebar items depend on your assigned role.

### Tips & Constraints

- Both email and password are required before submit
- Login is rate-limited server-side (20 attempts per 15 minutes)
- Deactivated users or users in inactive companies receive a `403` error
- Session is stored in localStorage (`lms_auth_token`) and an httpOnly cookie
- Theme on login syncs to system preference via `setTheme('system')`; in-app sidebar toggle still works after sign-in

---

## Access & Permissions

| | |
|---|---|
| **Required permission** | None (public route) |
| **Route guard** | `LoginWrapper` in [`App.tsx`](../../src/App.tsx) redirects authenticated users away |
| **Data scoping** | N/A |

---

## Developer Reference

### Component Tree

```
Login.tsx
├── login.css (scoped layout, max-width, padding, mesh, card shadow)
├── LoginFormCard.tsx (centered VAHANPLUS-style card)
├── AuthContext (login, isLoading, systemName, systemLogoUrl)
├── ThemeContext (setTheme('system') on mount)
├── ui/input, ui/button, ui/label
└── sonner toast notifications
```

### Layout

- Shell: `login-page` in [`src/styles/login.css`](../../src/styles/login.css) — `min-height: 100dvh`, flex centering
- Card container: `login-card-wrap` — hard `max-width: 400px` via plain CSS (not Tailwind arbitrary classes)
- Card padding/spacing: `login-card`, `login-form`, `login-field` classes in `login.css`
- Card shadow: layered `box-shadow` on `.login-card` in `login.css` (light + `.dark` variants)
- Note: login uses scoped `login.css` because this project's static `index.css` does not JIT-compile arbitrary Tailwind utilities

### Context Dependencies

| Context | Usage |
|---------|-------|
| `AuthContext` | `login()`, `isLoading`, `systemName`, `systemLogoUrl` (from public branding API on mount) |
| `ThemeContext` | `setTheme('system')` on mount so login reflects OS `prefers-color-scheme` |

### Client-Side Logic

- Form validation before API call
- Navigation handled by router after successful login (not in Login component)
- Welcome toast shown in `AuthContext.login`

### Event Bus

Not used on this page.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `POST` | `/api/auth/login` | Sign in button | `AuthContext.login` → `api.auth.login` |
| `GET` | `/api/config/branding/public` | App mount (logged out) | `AuthContext.refreshBranding` → `api.config.getPublicBranding` |
| `GET` | `/api/config/branding` | App mount (logged in) | `AuthContext.refreshBranding` → `api.config.getBranding` |

See [API Reference](../api-reference.md) for full request/response details.

---

## Related Pages

- [Dashboard](dashboard.md) — default post-login destination
- [Settings](settings.md) — where super admins configure system name and logo displayed on this page
