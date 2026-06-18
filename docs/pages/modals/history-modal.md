# History Modal

## Page Overview

| | |
|---|---|
| **Type** | Modal overlay (Dialog) |
| **Component** | [`src/components/HistoryModal.tsx`](../../src/components/HistoryModal.tsx) |
| **Heading** | Follow-up history for lead/director |
| **Opened from** | [Lead Detail modal](lead-detail.md) |

Read-only timeline of all follow-ups for a lead or specific director. Supports sorting, expand/collapse, and displays creator, timestamps, status, and remarks.

---

## User Guide

### What You See

- **Follow-up timeline** — Chronological list of all follow-up records
- **Status badges** — Color-coded Hot/Warm/Cold/Converted/Lost
- **Expandable entries** — Click to see full remark and metadata
- **Sort toggle** — Ascending/descending by creation date
- **Creator info** — Who logged each follow-up

### Key Actions

1. **Sort** — Toggle between oldest-first and newest-first
2. **Expand/collapse** — View full details of a follow-up entry
3. **Add follow-up** — Optional callback to parent Lead Detail form
4. **Close** — Return to Lead Detail

### Role-Based Differences

No role restrictions beyond parent Lead Detail access. All users who can view the lead can view its history.

### Tips & Constraints

- **Read-only** — no API mutations from this modal
- Shows both `active` and `updated` follow-up records
- Can filter to a single director when `directorId` prop is provided
- Data sourced from `LeadsContext.getAllFollowUps()`

---

## Access & Permissions

Inherits access from parent [Lead Detail](lead-detail.md) modal.

---

## Developer Reference

### Component Tree

```
HistoryModal.tsx
├── LeadsContext (getAllFollowUps)
├── AuthContext (users for creator names)
└── ui/dialog, ui/scroll-area, ui/badge
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `LeadsContext` | `getAllFollowUps(lead, directorId?)` |
| `AuthContext` | `users`, `user` |

### Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | boolean | Dialog visibility |
| `onOpenChange` | function | Toggle handler |
| `lead` | Lead | Lead whose history to display |
| `directorId` | string? | Optional director filter |
| `directorName` | string? | Display name for filter |
| `onAddFollowUp` | function? | Callback to parent form |

---

## APIs Used

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| — | — | No API calls | Read-only from cached lead data |

Follow-up data was previously fetched via `GET /api/leads` and stored in lead `directors[].followUps`.

---

## Related Pages

- [Lead Detail modal](lead-detail.md) — parent modal
- [Follow-up Calendar](../calendar.md) — calendar view of active follow-ups
- [Assigned Leads](../assigned.md) — manage leads with follow-ups
