# User Management Page

## Page Overview

| | |
|---|---|
| **Route** | `/users` |
| **Component** | [`src/components/UserManagement.tsx`](../../src/components/UserManagement.tsx) |
| **Sidebar label** | User Management |
| **Page heading** | **User Management** |

CRUD interface for managing users across companies. Supports role assignment, activation/deactivation, password reset, and user deletion with role-based constraints.

---

## User Guide

### What You See

- **Stat cards** — Total, Active, Inactive, Admins count
- **Search and filters** — Name/email search, role filter, status filter
- **User table** — Name, email, role badge, company, status, last login, actions (desktop `md+`)
- **Mobile cards** — Below `md` breakpoint, card layout with Edit/Delete actions
- **Add User dialog** — Create new user form
- **Edit User dialog** — Update name, email, role, password, status
- **Delete confirmation** — Permanent user removal

### Key Actions

1. **Add user** — Click Add User → fill name, email, password, role, company
2. **Edit user** — Actions → Edit → modify fields → save
3. **Deactivate user** — Toggle active status in edit dialog
4. **Delete user** — Actions → Delete → confirm (cannot delete yourself)
5. **Filter/search** — Narrow the user list

### Role-Based Differences

| Role | Can Manage |
|------|------------|
| super_admin | All roles except cannot assign super_admin via UI |
| platform_admin | company_admin, team_lead, sales_user |
| company_admin | team_lead, sales_user (own company) |
| team_lead | sales_user (own company) |

Assignable roles determined by `getAssignableRoles()` in [`roles.ts`](../../src/types/roles.ts).

### Tips & Constraints

- Cannot delete your own account
- Cannot deactivate your own account
- Email must be unique across the system
- Super admin users hidden from platform admin lists

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `MANAGE_USERS` | Page access and all CRUD |

**Route guard:** Redirects to `/dashboard` if `MANAGE_USERS` is missing.

**Data scoping:** Super admin sees all; platform admin excludes super admins; company roles see own company.

---

## Developer Reference

### Component Tree

```
UserManagement.tsx
├── AuthContext (users CRUD)
├── CompanyContext (company names)
└── Dialog forms for add/edit/delete
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `AuthContext` | `users`, `addUser`, `updateUser`, `deleteUser` |
| `CompanyContext` | `companies` (display names) |

### Event Bus

User list refreshes every 10 seconds via `AuthContext.refreshUsers`.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/users` | Mount + every 10s | `AuthContext.refreshUsers` |
| `POST` | `/api/users` | Add User form | `AuthContext.addUser` |
| `PATCH` | `/api/users/:id` | Edit User form | `AuthContext.updateUser` |
| `DELETE` | `/api/users/:id` | Delete confirmation | `AuthContext.deleteUser` |

---

## Related Pages

- [Companies](companies.md) — company context for user assignment; bulk delete users on company delete
- [Dashboard](dashboard.md) — Super Dashboard user overview
- [Settings](settings.md) — system configuration
