# Reports & Analytics Page

## Page Overview

| | |
|---|---|
| **Route** | `/reports` |
| **Component** | [`src/components/Reports.tsx`](../../src/components/Reports.tsx) |
| **Sidebar label** | Reports & Analytics |
| **Page heading** | **Reports & Analytics** |

Charts and KPIs for lead pipeline performance. All analytics are computed client-side from cached lead and user data — no dedicated reporting API exists.

---

## User Guide

### What You See

- **Company filter** — All companies or specific company (platform roles)
- **KPI cards** — Total leads, conversion rate, lost rate, active pipeline
- **Charts:**
  - Status distribution (pie chart)
  - Team performance (bar chart)
  - Monthly conversion trends (line chart)
  - Pipeline by status (bar chart)
- **Export button** — Download report summary as Excel

### Key Actions

1. **Filter by company** — Use company dropdown (platform admins see all companies)
2. **Review charts** — Hover for tooltips with exact values
3. **Export report** — Download Excel with current filter applied

### Role-Based Differences

| Role | Behavior |
|------|----------|
| super_admin, platform_admin | Company filter available; cross-company data |
| company_admin, team_lead | Company-scoped data only |
| sales_user | Sees only their assigned leads in metrics |

### Tips & Constraints

- Data reflects whatever is currently cached in `LeadsContext` — refresh happens via event polling
- No server-side aggregation; large datasets may affect render performance
- Lost leads included in lost rate calculation from separate lost leads cache

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_REPORTS` | Page access (all roles) |

**Data scoping:** Filtered by company and role in client-side computation.

---

## Developer Reference

### Component Tree

```
Reports.tsx
├── CompanyFilter.tsx (platform roles)
├── Recharts (PieChart, BarChart, LineChart)
├── LeadsContext (leads, lostLeads)
└── AuthContext (users, user)
```

### Context Dependencies

| Context | Data Used |
|---------|-----------|
| `LeadsContext` | `leads`, `lostLeads` |
| `AuthContext` | `users`, `user` |
| `CompanyContext` | companies (via CompanyFilter) |

### Client-Side Logic

- `useMemo` aggregations for conversion rate, status counts, monthly trends
- XLSX export of computed metrics
- Recharts for visualization

### Event Bus

Read-only; benefits from background lead refresh on events.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| — | — | No direct API calls | Pure client-side aggregation |

**Indirect data sources** (via contexts):

| Method | Endpoint | Provider |
|--------|----------|----------|
| `GET` | `/api/leads` | `LeadsContext` |
| `GET` | `/api/users` | `AuthContext` |
| `GET` | `/api/companies` | `CompanyContext` |

---

## Related Pages

- [Dashboard](dashboard.md) — high-level stat cards
- [Converted Leads](converted.md) — converted lead details
- [Companies](companies.md) — company-level stats
