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
- **Period filter** — All Time, This Month, This Quarter, This Year (filters all KPIs and charts)
- **KPI cards** — Total leads, conversion rate, converted count, active users
- **Charts:**
  - Monthly lead trend (Shadcn line chart, real `createdAt` data)
  - Status distribution (Shadcn donut chart)
  - Team performance (Shadcn grouped bar chart)
  - Lead pipeline (Shadcn horizontal bar chart)
- **Performance Summary** — Shadcn table (desktop) / stacked cards (mobile) with conversion progress bars
- **Export button** — Download report summary

### Key Actions

1. **Filter by company** — Use company dropdown (platform admins see all companies)
2. **Filter by period** — All Time, This Month, This Quarter, or This Year
3. **Review charts** — Hover for Shadcn tooltips with exact values
4. **Export report** — Download report with current filters applied

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
├── reports/ (Shadcn ChartContainer components)
│   ├── MonthlyTrendChart.tsx
│   ├── StatusDistributionChart.tsx
│   ├── TeamPerformanceChart.tsx
│   ├── PipelineFunnelChart.tsx
│   └── PerformanceSummaryTable.tsx
├── utils/reports/analytics.ts
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

- `useMemo` aggregations via [`src/utils/reports/analytics.ts`](../../src/utils/reports/analytics.ts)
- Period filter applied to leads (`createdAt`) and lost leads (`lostDate`)
- Shadcn `ChartContainer` + Recharts for visualization

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
