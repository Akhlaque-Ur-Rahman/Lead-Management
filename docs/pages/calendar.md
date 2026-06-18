# Follow-up Calendar Page

## Page Overview

| | |
|---|---|
| **Route** | `/calendar` |
| **Component** | [`src/components/CalendarView.tsx`](../../src/components/CalendarView.tsx) |
| **Sidebar label** | Follow-up Calendar |
| **Page heading** | **Follow-up Calendar** |

A monthly calendar view of scheduled follow-ups extracted from assigned leads. Users can navigate months, select days, filter by hour, and open lead details for follow-up actions.

---

## User Guide

### What You See

- **Month navigation** — Previous/next month buttons
- **Calendar grid** — Days with heat-map tint by follow-up density and numeric count
- **Activity legend** — Low (1–2), Medium (3–5), High (6+) follow-ups per day
- **Day panel** — Selected day's follow-ups grouped by hour
- **Follow-up cards** — Time, company name, status color, talked-to, remark
- **Hour filter** — Narrow day view to specific hours

### Key Actions

1. **Navigate months** — Use arrow buttons to change month
2. **Select a day** — Click a calendar day to see follow-ups
3. **View lead details** — Click a follow-up card → [Lead Detail modal](modals/lead-detail.md)
4. **Filter by hour** — Select hour tab in day panel

### Role-Based Differences

| Role | Behavior |
|------|----------|
| sales_user | Only sees follow-ups for leads assigned to themselves |
| company_admin, team_lead | Sees all company assigned lead follow-ups |
| platform roles | Cross-company view |

### Tips & Constraints

- Follow-ups are extracted client-side from lead `directors[].followUps` data
- Only **active** follow-ups shown (status `active` or unset)
- One active follow-up per director enforced by backend on add
- Direct editing from calendar navigates to Lead Pool with `?leadId=` deep link
- Day buttons expose follow-up count via `aria-label` for screen readers

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_CALENDAR` | Page access (all roles) |

**Data scoping:** Sales users filtered to `assignedTo === user.id`.

---

## Developer Reference

### Component Tree

```
CalendarView.tsx
├── LeadDetail.tsx (dialog)
├── LeadsContext (leads)
├── AuthContext (user)
└── getDirectorFollowUpsForDate utility
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `leads`, `loadLeadsAll('assigned')` |
| `AuthContext` | `user` |

### Client-Side Logic

- [`src/utils/followups/`](../../src/utils/followups/) — date extraction and grouping
- [`src/utils/followUpStatusColors.ts`](../../src/utils/followUpStatusColors.ts) — status badge colors
- `useMemo` for follow-ups by hour and latest active deduplication

### Event Bus

Reads from context; mutations via Lead Detail trigger events.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/leads?view=assigned` | Page load / refresh | `LeadsContext.loadLeadsAll` |
| `POST` | `/api/leads/:id/follow-up` | Via Lead Detail | `LeadsContext.addFollowUp` |
| `PATCH` | `/api/leads/:id` | Via Lead Detail | `LeadsContext.updateLead` |

No direct API calls from the calendar component itself.

---

## Related Pages

- [Assigned Leads](assigned.md) — table view of same leads
- [Lead Detail modal](modals/lead-detail.md) — add/edit follow-ups
- [History modal](modals/history-modal.md) — follow-up timeline
