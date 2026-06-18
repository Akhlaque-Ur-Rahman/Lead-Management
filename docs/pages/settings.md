# Settings Page

## Page Overview

| | |
|---|---|
| **Route** | `/settings`, `/subscription` (alias) |
| **Component** | [`src/components/Settings.tsx`](../../src/components/Settings.tsx) |
| **Sidebar label** | Settings |
| **Page heading** | **Settings** |

Tabbed administration for system branding, per-company field configuration, and subscription plan pricing. The `/subscription` route and `?tab=subscription` query both open the Subscription Plans tab.

---

## User Guide

### What You See

Three tabs (four defined but billing is placeholder):

| Tab | URL query | Visible To | Purpose |
|-----|-----------|------------|---------|
| **General** | `?tab=general` | All settings roles | System name (super admin) or custom company display name |
| **Field Settings** | `?tab=fields` | All settings roles | Toggle form/Excel fields, edit labels, set required flags |
| **Subscription Plans** | `?tab=subscription` or `/subscription` | super_admin only | Configure Basic/Professional/Enterprise pricing |
| **Billing** | `?tab=billing` | — | Placeholder (not fully implemented) |

Tab changes update the URL with `replace: true` so browser back/forward works within Settings.

### Key Actions

**General tab:**
1. Super admin: Edit global system name → Save (updates login page branding)
2. Company admin: Edit custom company display name shown in sidebar

**Field Settings tab:**
1. Toggle fields on/off for lead form and Excel import/export
2. Edit field labels
3. Mark fields as required
4. Click Save Field Settings

**Subscription Plans tab (super_admin):**
1. Edit monthly prices and max users per plan tier
2. Click Save Subscription Plans

### Role-Based Differences

| Role | Tabs Available |
|------|----------------|
| super_admin | General (branding), Field Settings, Subscription Plans |
| platform_admin | General (company name), Field Settings |
| company_admin | General (company name), Field Settings |

### Tips & Constraints

- Use `/subscription` or `?tab=subscription` to link directly to Subscription Plans
- Field config is per-company (`field-config/:companyId`)
- Branding changes appear on login page after refresh
- `MANAGE_BRANDING` is super_admin only on the API

---

## Access & Permissions

| Permission | Used For |
|------------|----------|
| `MANAGE_SETTINGS` | Page access |
| `MANAGE_BRANDING` | Global system name (super_admin) |
| `MANAGE_SUBSCRIPTION_PLANS` | Subscription tab (super_admin) |

**Route guard:** Redirects to `/dashboard` if `MANAGE_SETTINGS` is missing.

---

## Developer Reference

### Component Tree

```
Settings.tsx
├── AuthContext (branding, company display)
├── LeadsContext (fieldConfigs, setFieldConfigs)
├── CompanyContext (planPricing, updatePlanPricing)
└── Direct api calls for branding and company name
```

### Context Dependencies

| Context | Methods |
|---------|---------|
| `AuthContext` | `user`, `systemName`, `companyDisplayName` |
| `LeadsContext` | `fieldConfigs`, `setFieldConfigs` |
| `CompanyContext` | `planPricing`, `updatePlanPricing` |

### Direct API Calls

`Settings.tsx` is one of two components that import `api` directly (along with `LeadManagement.tsx`).

---

## APIs Used on This Page

| Method | Endpoint | Triggered By | Context/Caller |
|--------|----------|--------------|----------------|
| `GET` | `/api/config/branding` | App mount | `AuthContext.refreshBranding` |
| `PUT` | `/api/config/branding` | Save system name | `Settings.tsx` → `api.config.setBranding` |
| `GET` | `/api/config/field-config/:companyId` | User company change | `LeadsContext` |
| `PUT` | `/api/config/field-config/:companyId` | Save field settings | `LeadsContext.setFieldConfigs` |
| `GET` | `/api/config/plan-pricing` | Mount | `CompanyContext` |
| `PUT` | `/api/config/plan-pricing` | Save subscription plans | `CompanyContext.updatePlanPricing` |
| `PATCH` | `/api/companies/:id` | Save company display name | `Settings.tsx` → `api.companies.update` |
| `GET` | `/api/companies/:id` | Display name refresh | `AuthContext.refreshCompanyDisplay` |

---

## Related Pages

- [Login](login.md) — displays global branding
- [Lead Pool](leads.md) — field config affects Lead Form and Excel columns
- [Companies](companies.md) — subscription plans applied to companies
