# Dashboard Page

## Page Overview

| | |
|---|---|
| **Route** | `/dashboard` |
| **Component** | [`src/components/Dashboard.tsx`](../../src/components/Dashboard.tsx) or [`src/components/SuperDashboard.tsx`](../../src/components/SuperDashboard.tsx) |
| **Sidebar label** | Dashboard |
| **Page heading** | **Hi, Welcome back, {name}** (standard) or **Super Dashboard** (platform admins) |

The dashboard provides a high-level overview of lead activity. Standard users see summary stat cards computed from cached lead data. Super Admin and Platform Admin users see an alternate **Super Dashboard** with cross-company user management filters.

---

## User Guide

### What You See — Standard Dashboard

Four stat cards (three for sales users without converted access), plus:

| Section | Description |
|---------|-------------|
| **Getting started** | Onboarding checklist for company admins (3 steps, dismissible) |
| **Pipeline activity (7 days)** | Bar chart of new leads per day |
| **Follow-ups due today** | Actionable list with links to assigned leads |
| **Quick actions** | Shortcuts to Lead Pool, Assigned, Reports, Lost |

| Card | Description |
|------|-------------|
| **Lead Pool** | Active unassigned leads |
| **Assigned** | Active assigned leads |
| **Converted** | Total converted leads (hidden for sales users) |
| **Lost** | Total lost leads; also shows follow-ups due today |

### What You See — Super Dashboard

Rendered when user has `VIEW_SUPER_DASHBOARD` (super_admin, platform_admin):

- **Filter bar** — Status (active/inactive), role checkboxes, company dropdown, search by name/email
- **User table** — All non-super-admin users with company, role, status, last login
- **Stats summary** — Total, active, inactive user counts
- Filters sync to URL query parameters for shareable/bookmarkable views

### Key Actions

**Standard dashboard:** Read-only overview. Navigate to other pages via sidebar for actions.

**Super Dashboard:**
1. Filter users by status, role, company, or search term
2. URL updates automatically (`?status=`, `?roles=`, `?company=`, `?search=`)
3. Review user activity across all companies

### Role-Based Differences

| Role | View |
|------|------|
| super_admin, platform_admin | Super Dashboard (user-centric, cross-company) |
| company_admin, team_lead, sales_user | Standard stat cards (lead-centric, company-scoped data) |
| sales_user | No Converted card |

### Tips & Constraints

- Stats are computed client-side from `LeadsContext` cached data
- Data refreshes via background polling (users/companies every 10s, events every 3s)
- Super Dashboard excludes super_admin users from the user list

---

## Access & Permissions

| | |
|---|---|
| **Required permission** | `VIEW_DASHBOARD` (all authenticated roles) |
| **Super Dashboard** | `VIEW_SUPER_DASHBOARD` (super_admin, platform_admin) |
| **Route guard** | `ProtectedRoute` wrapper |
| **Data scoping** | Leads filtered by role in `LeadsContext`; users scoped in `AuthContext` |

---

## Developer Reference

### Component Tree

```
Dashboard.tsx
├── SuperDashboard.tsx (conditional, VIEW_SUPER_DASHBOARD)
│   ├── CompanyContext (companies)
│   ├── AuthContext (users)
│   └── useSearchParams (URL filter sync)
└── Stat cards from LeadsContext.leads (useMemo)
```

### Context Dependencies

| Context | Usage |
|---------|-------|
| `AuthContext` | `user`, `users` (Super Dashboard) |
| `CompanyContext` | `companies` (Super Dashboard) |
| `LeadsContext` | `leads` (stat computation) |

### URL Query Parameters (Super Dashboard)

| Param | Example | Description |
|-------|---------|-------------|
| `status` | `active`, `inactive`, `all` | User active status filter |
| `roles` | `company_admin,team_lead` | Comma-separated role filter |
| `company` | Company ID or `all` | Company filter |
| `search` | Free text | Name/email search (debounced 300ms) |

### Event Bus

No direct API calls. Data arrives via context providers that poll/refresh on events.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| — | — | No direct page API calls | Reads cached data from contexts |

**Indirect APIs** (via global context providers):

| Method | Endpoint | Provider |
|--------|----------|----------|
| `GET` | `/api/leads` | `LeadsContext.loadLeadsAll` |
| `GET` | `/api/users` | `AuthContext.refreshUsers` (every 10s) |
| `GET` | `/api/companies` | `CompanyContext.refreshCompanies` (every 10s) |
| `GET` | `/api/events/latest` | `eventBus` (every 3s) |

---

## Related Pages

- [Lead Pool](leads.md) — drill into unassigned leads
- [Assigned Leads](assigned.md) — drill into assigned leads
- [Users](users.md) — full user CRUD (Super Dashboard is read-only overview)
- [Companies](companies.md) — company management for platform admins
