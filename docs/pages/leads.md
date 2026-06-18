# Lead Pool Page

## Page Overview

| | |
|---|---|
| **Route** | `/leads` (optional `?leadId=<id>` for deep link to Lead Detail) |
| **Component** | [`src/components/LeadManagement.tsx`](../../src/components/LeadManagement.tsx) |
| **Sidebar label** | Lead Pool |
| **Page heading** | **Leads Needing Follow-Up** (admins) / **My Pending Leads** (sales users) |

The Lead Pool is the primary workspace for viewing, creating, importing, exporting, and assigning unassigned leads. Users can search, filter by status, sort, open lead details, and bulk-import leads from Excel/CSV files.

---

## User Guide

### What You See

- **Header** with page title (role-dependent)
- **Action buttons** — Add Lead, Import Excel, Export Excel (import/export require `IMPORT_LEADS`)
- **Search bar** — Filter by company name, CIN, email, mobile
- **Status filter** — All, Hot, Warm, Cold
- **Sort** — Latest or Oldest
- **Lead table** (desktop) or **card list** (mobile, below `md`) — Company name, CIN, status, assigned user, actions
- **Pagination** — Client-side paging of filtered results
- **Deep link** — `/leads?leadId=<id>` opens Lead Detail when the lead is loaded

### Key Actions

1. **Add a lead** — Click Add Lead → fill Lead Form dialog → save
2. **View lead details** — Click a row or card → opens [Lead Detail modal](modals/lead-detail.md); shareable via `?leadId=`
3. **Edit a lead** — Actions menu → Edit → opens [Lead Form modal](modals/lead-form.md)
4. **Assign a lead** — Select user from assign dropdown (requires `ASSIGN_LEADS`)
5. **Import Excel/CSV** — Upload file (max 5 MB); duplicates checked before import
6. **Export** — Download current filtered leads as Excel

### Role-Based Differences

| Role | Behavior |
|------|----------|
| company_admin, team_lead | Full pool view; can import and assign |
| sales_user | Sees "My Pending Leads" — only their assigned pending leads |
| super_admin, platform_admin | Read-only pool view; cannot assign (super_admin) or import |

### Tips & Constraints

- Excel import max file size: **5 MB**
- Batch import max: **500 leads** per request
- Duplicate CIN check runs before import (`check-duplicates-scoped`)
- New leads default to **Cold** status unless specified
- Only Hot, Warm, Cold statuses allowed on create/import

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_LEAD_POOL` | Page access (all roles) |
| `IMPORT_LEADS` | Add lead, Excel import |
| `ASSIGN_LEADS` | Assign dropdown |

**Data scoping:** Company-scoped for company roles; platform roles see all leads; sales users see assigned leads only.

---

## Developer Reference

### Component Tree

```
LeadManagement.tsx
├── LeadForm.tsx (add/edit dialog)
├── LeadDetail.tsx (view dialog)
├── AuthContext (user, users)
├── LeadsContext (leads, CRUD, assign, batch import)
└── Direct api import for check-duplicates-scoped
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `leads`, `addLead`, `updateLead`, `assignLead`, `batchAddLeads`, `loadLeadsAll` |
| `AuthContext` | `user`, `users` |

### Client-Side Logic

- [`src/utils/filters/`](../../src/utils/filters/) — pool filtering
- [`src/utils/imports/duplicateCheck.ts`](../../src/utils/imports/duplicateCheck.ts) — batch duplicate validation
- XLSX library for Excel parse/export

### Event Bus

All mutations trigger `POST /api/events` via `LeadsContext`, causing 3s polling refresh across tabs.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/leads?view=pool` | Page load / refresh | `LeadsContext.loadLeadsAll` |
| `POST` | `/api/leads` | Add Lead form | `LeadsContext.addLead` |
| `PATCH` | `/api/leads/:id` | Edit Lead form | `LeadsContext.updateLead` |
| `POST` | `/api/leads/batch` | Excel import | `LeadsContext.batchAddLeads` |
| `POST` | `/api/leads/check-duplicates` | Import dedup | `duplicateCheck.ts` |
| `POST` | `/api/leads/check-duplicates-scoped` | Import CIN check | `LeadManagement.tsx` (direct) |
| `POST` | `/api/leads/:id/assign` | Assign dropdown | `LeadsContext.assignLead` |
| `POST` | `/api/events` | After mutations | `eventBus.triggerUpdateEvent` |

---

## Related Pages

- [Assigned Leads](assigned.md) — after assignment, leads move here
- [Lead Detail modal](modals/lead-detail.md) — full lead view and follow-ups
- [Lead Form modal](modals/lead-form.md) — add/edit form
- [Settings](settings.md) — field configuration affects form and Excel columns
