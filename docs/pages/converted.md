# Converted Leads Page

## Page Overview

| | |
|---|---|
| **Route** | `/converted` |
| **Component** | [`src/components/ConvertedLeads.tsx`](../../src/components/ConvertedLeads.tsx) |
| **Sidebar label** | Converted Leads |
| **Page heading** | **Converted Leads** |

Displays successfully converted leads with financial details (invoice number, project value). Supports search, filtering, Excel export, and read-only lead detail viewing.

---

## User Guide

### What You See

- **Financial data notice** — Warning banner about sensitive information
- **Stat cards** — Total converted, total project value, average deal size
- **Search and filters** — Company name, date range
- **Lead table** — Company, converted date, invoice, project value, converted by
- **Export button** — Download as Excel

### Key Actions

1. **Search** — Filter by company name or CIN
2. **View lead** — Click row → [Lead Detail modal](modals/lead-detail.md) (read-only for most fields)
3. **Export Excel** — Download converted leads spreadsheet

### Role-Based Differences

| Role | Access |
|------|--------|
| super_admin, company_admin | Full access including financial columns (`VIEW_FINANCIAL_DATA`) |
| platform_admin, team_lead | Page access but financial columns show "Access Restricted" |
| sales_user | **No access** — page shows access denied message |

### Tips & Constraints

- Financial fields (`invoiceNo`, `projectValue`) stripped server-side without `VIEW_FINANCIAL_DATA`
- Conversion typically happens via follow-up status in Lead Detail, not the dedicated `mark-converted` API
- Export respects visible columns based on permissions

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_CONVERTED_LEADS` | Page access (excludes sales_user) |
| `VIEW_FINANCIAL_DATA` | Invoice and project value columns |

**Route guard:** Component renders access-denied message if `VIEW_CONVERTED_LEADS` is missing.

---

## Developer Reference

### Component Tree

```
ConvertedLeads.tsx
├── LeadDetail.tsx (dialog, read-only mode)
├── LeadsContext (leads, loadLeadsAll)
└── AuthContext (user)
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `leads`, `loadLeadsAll('converted')` |
| `AuthContext` | `user` |

### Client-Side Logic

- Currency formatting for project values
- XLSX export generation
- Client-side search and date filtering

### Event Bus

Read-only page; no mutations from this view directly.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/leads?view=converted` | Page load / refresh | `LeadsContext.loadLeadsAll` |

Financial fields filtered by `stripFinancialFields()` on the server per user role.

---

## Related Pages

- [Lead Detail modal](modals/lead-detail.md) — where leads are marked converted
- [Reports](reports.md) — conversion rate analytics
- [Lost Leads](lost.md) — opposite lifecycle outcome
