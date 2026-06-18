# Company Management Page

## Page Overview

| | |
|---|---|
| **Route** | `/companies` |
| **Component** | [`src/components/CompanyManagement.tsx`](../../src/components/CompanyManagement.tsx) |
| **Sidebar label** | Companies |
| **Page heading** | **Company Management** |

Multi-tenant company administration. Create, edit, block, and delete companies. View per-company statistics including leads, conversion rate, and active users. Manage subscription plans.

---

## User Guide

### What You See

- **Stat cards** — Total, Active, Inactive, plan breakdown (Enterprise/Professional/Basic)
- **Selected company stats** — Total leads, converted, conversion rate, active/inactive users
- **Company table** — Name, email, plan, status, user count, actions
- **Add/Edit company dialogs** — Company details and subscription configuration
- **Block/Delete confirmations** — Deactivate or permanently remove companies

### Key Actions

1. **Add company** — Name, email, phone, address, subscription plan
2. **Edit company** — Update details, change plan, set max users
3. **Block company** — Deactivate company (cascades to deactivate all users)
4. **Unblock company** — Reactivate company and users deactivated by company block
5. **Delete company** — Hard delete (super_admin only); also deletes all company users
6. **Add user to company** — Quick user creation from company context

### Role-Based Differences

| Role | Access |
|------|--------|
| super_admin | Full CRUD including hard delete |
| platform_admin | Create, edit, block; cannot hard delete |
| Others | No access — redirected to dashboard |

### Tips & Constraints

- Company IDs auto-generated: `CO_YYYYMMDD_XXXX`
- Duplicate company name or email rejected
- Custom plan requires max users and optional monthly price
- Blocking sets `deactivated_by_company` flag on users for selective reactivation

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `MANAGE_COMPANIES` | Page access (super_admin, platform_admin) |

**Route guard:** Redirects to `/dashboard` if permission missing.

---

## Developer Reference

### Component Tree

```
CompanyManagement.tsx
├── CompanyContext (CRUD, planPricing)
├── AuthContext (addUser, deleteUsersByCompanyId)
└── Dialog forms for add/edit/block/delete
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `CompanyContext` | `companies`, `addCompany`, `updateCompany`, `deleteCompany`, `planPricing` |
| `AuthContext` | `addUser`, `deleteUsersByCompanyId` |

### Event Bus

Companies refresh every 10 seconds via `CompanyContext`.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/companies` | Mount + every 10s | `CompanyContext.refreshCompanies` |
| `POST` | `/api/companies` | Add Company form | `CompanyContext.addCompany` |
| `PATCH` | `/api/companies/:id` | Edit/Block form | `CompanyContext.updateCompany` |
| `DELETE` | `/api/companies/:id` | Delete confirmation | `CompanyContext.deleteCompany` |
| `DELETE` | `/api/users/by-company/:companyId` | Company delete flow | `AuthContext.deleteUsersByCompanyId` |
| `POST` | `/api/users` | Add user with company | `AuthContext.addUser` |
| `GET` | `/api/config/plan-pricing` | Mount | `CompanyContext` (plan pricing) |

---

## Related Pages

- [Users](users.md) — manage users within companies
- [Settings](settings.md) — subscription plan pricing configuration
- [Dashboard](dashboard.md) — Super Dashboard cross-company user view
