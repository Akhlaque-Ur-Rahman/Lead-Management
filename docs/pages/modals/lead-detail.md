# Lead Detail Modal

## Page Overview

| | |
|---|---|
| **Type** | Modal overlay (Dialog) |
| **Component** | [`src/components/LeadDetail.tsx`](../../src/components/LeadDetail.tsx) |
| **Heading** | **{companyName}** — "Lead details and contact information" |
| **Opened from** | [Lead Pool](leads.md), [Assigned Leads](assigned.md), [Calendar](calendar.md), [Converted Leads](converted.md), [Lost Leads](lost.md) |

Full lead view and action center. Displays MCA company data, directors, follow-up scheduling, status changes, conversion, and lost marking. Primary surface for day-to-day lead management after assignment.

---

## User Guide

### What You See

- **Company header** — Name, CIN, status badge
- **Business info** — MCA fields (capital, incorporation date, address, email)
- **Directors section** — Director cards with contact details
- **Follow-up form** — Date, time, talked-to, remark, outcome status
- **Financial section** — Invoice and project value (if `VIEW_FINANCIAL_DATA`)
- **Action buttons** — Edit, History, Mark Converted, Mark Lost
- **Assignment info** — Currently assigned user

### Key Actions

1. **Add follow-up** — Fill date, time, director, remark, status → Save
2. **Mark as Converted** — Via follow-up status or dedicated flow (requires invoice/value for financial roles)
3. **Mark as Lost** — Provide lost remark → status changes to Lost
4. **View history** — Opens [History Modal](history-modal.md)
5. **Edit lead** — Triggers parent's edit flow → [Lead Form](lead-form.md)

### Role-Based Differences

| Role | Behavior |
|------|----------|
| sales_user | Can only view leads assigned to them; redirected if unauthorized |
| team_lead, company_admin | Full follow-up and status actions on company leads |
| super_admin | Read-only (cannot assign or modify) |
| Financial data | Visible only with `VIEW_FINANCIAL_DATA` |

### Tips & Constraints

- Follow-ups require lead to be assigned first
- Singleton follow-up rule: adding a new follow-up marks previous active ones as `updated`
- UI uses `addFollowUp` + `leadUpdates` instead of dedicated `mark-lost` / `mark-converted` APIs
- Converted/Lost flows set status via follow-up outcome

---

## Access & Permissions

Access inherited from parent page. Additional checks:

| Check | Rule |
|-------|------|
| Sales user scope | `lead.assignedTo === user.id` |
| Edit access | `EDIT_ALL_LEADS` or `EDIT_ASSIGNED_LEADS` |
| Financial view | `VIEW_FINANCIAL_DATA` |

---

## Developer Reference

### Component Tree

```
LeadDetail.tsx
├── HistoryModal.tsx
├── LeadsContext (updateLead, addFollowUp)
├── AuthContext (user, users)
└── followUpStatusColors utils
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `updateLead`, `addFollowUp` |
| `AuthContext` | `user`, `users` |

### Event Bus

All follow-up and status mutations emit events.

---

## APIs Used

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `PATCH` | `/api/leads/:id` | Status/field updates | `LeadsContext.updateLead` |
| `POST` | `/api/leads/:id/follow-up` | Add follow-up (incl. lost/converted) | `LeadsContext.addFollowUp` |
| `POST` | `/api/leads/:id/assign` | Assign from parent pages | `LeadsContext.assignLead` |
| `POST` | `/api/events` | After mutations | `eventBus` |

> Dedicated `mark-lost` and `mark-converted` endpoints exist but are **not used** by this component.

---

## Related Pages

- [Lead Form modal](lead-form.md) — edit lead fields
- [History modal](history-modal.md) — follow-up timeline
- [Assigned Leads](../assigned.md) — primary workflow page
