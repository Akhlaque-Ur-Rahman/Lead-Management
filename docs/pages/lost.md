# Lost Leads Page

## Page Overview

| | |
|---|---|
| **Route** | `/lost` |
| **Component** | [`src/components/LostLeads.tsx`](../../src/components/LostLeads.tsx) |
| **Sidebar label** | Lost Leads |
| **Page heading** | **Lost Leads** |

View leads marked as lost. Authorized users can restore leads back to Cold status or permanently delete them from the system.

---

## User Guide

### What You See

- **Stat card** — Total lost leads count
- **Search bar** — Filter by company name or CIN
- **Lead table** — Company, lost date, lost by, remark, actions
- **Action buttons** — Restore, Permanent Delete (role-dependent)

### Key Actions

1. **View lead** — Click row → [Lead Detail modal](modals/lead-detail.md)
2. **Restore lead** — Returns lead to Cold status (requires `RESTORE_LOST_LEADS`)
3. **Permanently delete** — Irreversible removal (requires `DELETE_LOST_LEADS`, super_admin only)

### Role-Based Differences

| Role | Behavior |
|------|----------|
| company_admin | Can restore and view all company lost leads |
| platform_admin | Can restore; cannot permanently delete |
| team_lead | View only; cannot restore or delete |
| sales_user | Sees only leads they marked as lost (`lost_by = user.id`); cannot restore or delete |
| super_admin | Full restore and permanent delete |

### Tips & Constraints

- Permanent delete shows confirmation dialog — action cannot be undone
- Only leads with status `Lost` can be permanently deleted (server enforced)
- Restore sets status back to `Cold` and clears lost metadata

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_LOST_LEADS` | Page access (all roles) |
| `RESTORE_LOST_LEADS` | Restore button |
| `DELETE_LOST_LEADS` | Permanent delete (super_admin only) |

**Data scoping:** Sales users see only their own lost leads.

---

## Developer Reference

### Component Tree

```
LostLeads.tsx
├── LeadDetail.tsx (dialog)
├── LeadsContext (restoreLostLead, permanentlyDeleteLost)
└── AuthContext (user)
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `leads`, `loadLeadsAll('lost')`, `restoreLostLead`, `permanentlyDeleteLost` |
| `AuthContext` | `user` |

### Event Bus

Restore and delete operations emit events for cross-tab sync.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/leads?view=lost` | Page load / refresh | `LeadsContext.loadLeadsAll` |
| `POST` | `/api/leads/:id/restore-lost` | Restore button | `LeadsContext.restoreLostLead` |
| `DELETE` | `/api/leads/:id` | Permanent delete | `LeadsContext.permanentlyDeleteLost` |
| `POST` | `/api/events` | After restore/delete | `eventBus` |

---

## Related Pages

- [Lead Pool](leads.md) — restored leads return to active pool
- [Lead Detail modal](modals/lead-detail.md) — where leads are marked lost
- [Converted Leads](converted.md) — alternative lifecycle outcome
