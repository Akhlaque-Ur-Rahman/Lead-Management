# Follow-up Calendar Page

## Page Overview

| | |
|---|---|
| **Route** | `/calendar` |
| **Component** | [`src/components/CalendarView.tsx`](../../src/components/CalendarView.tsx) |
| **Sidebar label** | Follow-up Calendar |
| **Page heading** | **Follow-up Calendar** |

A monthly or weekly calendar view of scheduled follow-ups from assigned leads. KPI summary, heat-map grid, day agenda with hour chips, and lead detail dialog.

---

## User Guide

### What You See

- **KPI strip** — Today, This week, This month, Overdue (deduped per company/lead)
- **Month / Week toggle** — Switch between full month grid and 7-day week strip
- **Week start** — Sun start or Mon start (toggle in calendar header)
- **Calendar grid** — Heat-map tint by deduped follow-up count; dot when raw count exceeds deduped
- **Activity legend** — Low (1–2), Medium (3–5), High (6+) companies per day
- **Day agenda** — Selected day's follow-ups with hour chip filter
- **Agenda cards** — Time, company, director, status, phone (`tel:` link), remark; overdue badge on past dates
- **Mobile sheet** — Tap a day to open bottom sheet with the same agenda (desktop shows side panel)

### Key Actions

1. **Navigate** — Previous/next month or week; **Today** jumps to current date
2. **Select a day** — Click a calendar day (today selected by default)
3. **Filter by hour** — Use chip tabs (All, 09:00, …)
4. **View lead details** — Click an agenda card → [Lead Detail modal](modals/lead-detail.md)
5. **Keyboard** — Focus calendar grid: arrows move day, Home = today, PageUp/PageDown = prev/next period

### Role-Based Differences

| Role | Behavior |
|------|----------|
| sales_user | Only sees follow-ups for leads assigned to themselves |
| team_lead | Only sees follow-ups for leads assigned to themselves |
| company_admin, platform roles | Sees all company assigned lead follow-ups |

### Tips & Constraints

- Follow-ups are extracted client-side from lead `directors[].followUps` data
- Only **active** follow-ups shown (status `active` or unset)
- Day panel shows one active follow-up per lead (latest by `createdAt`)
- Grid count matches panel dedupe rule; aria-label notes total when higher
- Direct editing from calendar navigates to Lead Pool with `?leadId=` deep link

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `VIEW_CALENDAR` | Page access (all roles) |

**Data scoping:** Sales users and team leads filtered to `assignedTo === user.id`.

---

## Developer Reference

### Component Tree

```
CalendarView.tsx
├── BentoStatCard (KPI strip)
├── FollowUpAgendaCard
├── DayAgendaPanel (internal)
├── Sheet (mobile agenda)
├── LeadDetail.tsx (dialog)
├── utils/followups/calendar.ts
└── LeadsContext
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `leads`, `isLoading`, `loadLeadsAll('assigned')`, `getDirectorFollowUpsForDate` |
| `AuthContext` | `user` |
| `PageMetaContext` | `usePageMeta` (dynamic month count in description) |

---

## Related Pages

- [Assigned Leads](assigned.md) — table view of same leads
- [Lead Detail modal](modals/lead-detail.md) — add/edit follow-ups
