# Lead Form Modal

## Page Overview

| | |
|---|---|
| **Type** | Modal overlay (Dialog) |
| **Component** | [`src/components/LeadForm.tsx`](../../src/components/LeadForm.tsx) |
| **Opened from** | [Lead Pool](leads.md) — Add Lead and Edit actions |

Form dialog for creating new leads or editing existing ones. Fields are dynamically shown/hidden based on per-company field configuration from Settings.

---

## User Guide

### What You See

- **Tabbed form** — Company Info and Directors tabs
- **Dynamic fields** — Rendered based on `fieldConfigs` (CIN, company name, capital, address, etc.)
- **Directors section** — Add/remove director entries with DIN, name, mobile, email
- **Status selector** — Hot, Warm, Cold (edit mode)
- **Assign to** — User dropdown (required on create)
- **Notes** — Free-text notes field

### Key Actions

1. **Add lead** — Fill required fields → Submit → creates via parent `handleAddLead`
2. **Edit lead** — Pre-populated form → Submit → updates via parent `handleEditLead`
3. **Add director** — Click Add Director → fill director fields
4. **Cancel** — Close without saving

### Role-Based Differences

| Role | Behavior |
|------|----------|
| company_admin, team_lead | Can create and edit leads |
| sales_user | Limited edit on assigned leads (via parent page) |
| Field visibility | Controlled by Settings → Field Settings per company |

### Tips & Constraints

- Assignment is always required on create
- Validation uses `fieldConfigs` required flags
- Directors support multiple entries per lead
- Legacy single-director fields maintained for backward compatibility
- Form does not call API directly — parent `LeadManagement` handles `addLead` / `updateLead`

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `IMPORT_LEADS` | Create new leads |
| `EDIT_ALL_LEADS` / `EDIT_ASSIGNED_LEADS` | Edit existing leads |

---

## Developer Reference

### Component Tree

```
LeadForm.tsx
├── LeadsContext (fieldConfigs, leads for validation)
├── AuthContext (user, users for assign dropdown)
└── ui/form components (Input, Select, Tabs, Textarea)
```

### Context Dependencies

| Context | Data |
|---------|------|
| `LeadsContext` | `fieldConfigs`, `leads` |
| `AuthContext` | `user`, `users` |

### Props

| Prop | Type | Description |
|------|------|-------------|
| `onSubmit` | function | Parent handles API call |
| `onCancel` | function | Close dialog |
| `initialData` | Lead \| null | Pre-fill for edit mode |

---

## APIs Used

No direct API calls. Parent component triggers:

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `POST` | `/api/leads` | Add mode submit | `LeadManagement` → `LeadsContext.addLead` |
| `PATCH` | `/api/leads/:id` | Edit mode submit | `LeadManagement` → `LeadsContext.updateLead` |
| `GET` | `/api/config/field-config/:companyId` | Context mount | `LeadsContext` |

---

## Related Pages

- [Lead Pool](../leads.md) — parent page
- [Lead Detail modal](lead-detail.md) — view after creation
- [Settings](../settings.md) — field configuration
