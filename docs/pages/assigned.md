# Assigned Leads Page

## Page Overview

| | |
|---|---|
| **Route** | `/assigned` |
| **Component** | [`src/components/AssignedLeads.tsx`](../../src/components/AssignedLeads.tsx) |
| **Sidebar label** | Assigned Leads |
| **Page heading** | **Assigned Leads** |

View and manage leads that have been assigned to team members. Shows status breakdown (Hot/Warm/Cold), team distribution stats, user filter, and supports reassignment.

---

## User Guide

### What You See

- **Stat cards** — Total Assigned, Hot, Warm, Cold counts
- **Team distribution** — Per-user assigned lead counts
- **Search bar** — Filter by company name or CIN
- **User filter** — Filter by assigned team member
- **Status filter** — All, Hot, Warm, Cold
- **Lead table** — Company, status, assigned user, next follow-up, actions (desktop `md+`)
- **Mobile cards** — Below `md` breakpoint, same data as table in card layout with View/Edit actions
- **Pagination** — Client-side

### Key Actions

1. **View lead** — Click row → [Lead Detail modal](modals/lead-detail.md)
2. **Reassign lead** — Change assigned user dropdown (requires `ASSIGN_LEADS`)
3. **Add follow-up** — Via Lead Detail modal after opening a lead

### Role-Based Differences

| Role | Behavior |
|------|----------|
| company_admin | Sees all company assigned leads; can reassign to any eligible user |
| team_lead | Sees own leads + sales users' leads; can reassign to sales users and self |
| sales_user | Sees only leads assigned to themselves |
| platform_admin | Cross-company view |

### Tips & Constraints

- Reassignment validates `canAssignToUser()` — team leads cannot assign to company admins
- Data loaded with `view=assigned` query parameter
- Sort by latest/oldest creation date

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_ASSIGNED_LEADS` | Page access (all roles) |
| `ASSIGN_LEADS` | Reassign dropdown |

**Data scoping:** Team leads see subset of company users; sales users see own leads only.

---

## Developer Reference

### Component Tree

```
AssignedLeads.tsx
├── LeadDetail.tsx (dialog)
├── AuthContext (user, users)
└── LeadsContext (leads, assignLead, loadLeadsAll)
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `leads`, `assignLead`, `loadLeadsAll('assigned')` |
| `AuthContext` | `user`, `users` |

### Client-Side Logic

- Role-based user list filtering for team distribution stats
- Client-side search, status, and user filters

### Event Bus

Reassignment triggers event emission and cross-tab refresh.

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/leads?view=assigned` | Page load / refresh | `LeadsContext.loadLeadsAll` |
| `POST` | `/api/leads/:id/assign` | Reassign dropdown | `LeadsContext.assignLead` |
| `PATCH` | `/api/leads/:id` | Via Lead Detail | `LeadsContext.updateLead` |
| `POST` | `/api/leads/:id/follow-up` | Via Lead Detail | `LeadsContext.addFollowUp` |
| `POST` | `/api/events` | After mutations | `eventBus` |

---

## Related Pages

- [Lead Pool](leads.md) — unassigned leads source
- [Follow-up Calendar](calendar.md) — calendar view of same follow-ups
- [Lead Detail modal](modals/lead-detail.md) — primary action surface
