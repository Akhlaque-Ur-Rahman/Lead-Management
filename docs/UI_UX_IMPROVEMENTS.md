# UI/UX Improvements Guide

Developer and user-facing reference for the LMS interface redesign (Phases 1–3) and Batch 1 polish features.

**Last updated:** June 2026

---

## 1. Overview

### Goals

- Consistent visual language (status colors, typography, spacing)
- Reusable layout primitives for faster page development
- Improved navigation (sidebar groups, command palette, breadcrumbs)
- Mobile-friendly lead browsing and clearer page hierarchy

### Phases completed

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Design tokens, status badges, globals | Shipped |
| 2 | App shell, sidebar, command palette | Shipped |
| 3 | Dashboard, Login, Lead Pool, LeadForm wizard | Shipped |
| Batch 1 | Deep links, mobile cards, PageHeader rollout, Settings URL sync, 404, Help | Shipped |
| Phase 2 | Contrast & readability (WCAG AA tokens, semantic surfaces, validation script) | Shipped |
| Phase 3 | Onboarding checklist, pipeline trend chart, calendar heat-map, ARIA fixes, static a11y script | Shipped |
| Phase 3 fixes | Dashboard data load, local dates, onboarding/calendar edge cases | Shipped |
| Phase 4 | Mobile cards (Assigned/Users), collapsible sidebar, sales bottom nav | Shipped |
| Phase 5 | Accessibility CI (Playwright + axe, extended static checks) | Shipped |
| Phase 6 | Brand theming, virtualized tables, LeadForm zod | Shipped |
| Phase 7 | Premium mesh canvas, elevated cards, sidebar controls, Super Dashboard polish | Shipped |
| Phase 8 | Surface consistency rollout, static cards (no hover glow) | Shipped |
| Phase 9 | Bento dashboards, hero metric cards, light sidebar | Shipped |
| Phase 10 | Bento admin rollout, tablet spans, collapsed nav indicator | Shipped |
| Phase 11 | Contrast hardening + pipeline bento rollout | Shipped |
| Phase 12 | Premium card depth — stat variants + elevated panels | Shipped |
| Phase 13 | Unified chrome — bento hero KPIs, canvas background, page meta header | Shipped |
| Phase 14 | Follow-up Calendar UX — KPIs, week view, mobile sheet, agenda cards | Shipped |

---

## 2. Design system updates

### Status semantic tokens

Defined in [`src/styles/globals.css`](../src/styles/globals.css):

- `--status-hot`, `--status-warm`, `--status-cold`, `--status-converted`, `--status-lost`
- Utility classes: `.status-badge-hot`, `.status-badge-warm`, etc.
- [`src/utils/followUpStatusColors.ts`](../src/utils/followUpStatusColors.ts) maps lead status to badge classes

### Typography

- **Body:** Inter (`font-sans`)
- **Headings / display:** Plus Jakarta Sans (`font-display`)

### Sidebar tokens

- `--sidebar-background`, `--sidebar-foreground`, `--sidebar-accent`, etc.
- Explicit muted levels: `--sidebar-foreground-muted`, `--sidebar-foreground-subtle` (no opacity mix)
- Utility classes: `.bg-sidebar`, `.text-sidebar-foreground`, `.text-sidebar-foreground-muted`

### Contrast tokens (Phase 2)

- **`--placeholder-foreground`** — input/search placeholders (AA on card background)
- **`--badge-neutral-bg` / `--badge-neutral-fg`** — count badges (`.badge-neutral`)
- **`--icon-success` / `--icon-warning` / `--icon-info` / `--icon-muted`** — semantic icon utilities
- **Stat surfaces** — `--stat-hot-surface`, `--stat-warm-surface`, `--stat-cold-surface` with paired fg/muted colors
- **`--status-info-*`** — info chips (e.g. "Upcoming" in Lead Detail)

Validate pairs anytime:

```bash
npm run check:contrast
```


## 3. New components & hooks

| Component / Hook | Path | Purpose |
|------------------|------|---------|
| `PageHeader` | `src/components/layout/PageHeader.tsx` | Page title, description, optional action buttons |
| `EmptyState` | `src/components/layout/EmptyState.tsx` | Zero-data placeholder with optional CTA |
| `LoadingTable` | `src/components/layout/LoadingTable.tsx` | Skeleton table while data loads |
| `AppShell` | `src/components/layout/AppShell.tsx` | Top bar: breadcrumb, Cmd+K, help link |
| `CommandPalette` | `src/components/CommandPalette.tsx` | Keyboard-driven navigation |
| `HelpPage` | `src/components/HelpPage.tsx` | In-app help at `/help` |
| `NotFound` | `src/components/NotFound.tsx` | Friendly 404 for unknown routes |
| `usePagination` | `src/hooks/usePagination.ts` | Client-side page state for tables |

### Example: adding a new page

```tsx
import { PageHeader } from './layout/PageHeader';
import { PaginationControls } from './ui/pagination-controls';
import { usePagination } from '../hooks/usePagination';

export function MyPage() {
  const { paginatedItems, currentPage, totalPages, pageSize, totalCount, setPage, setPageSize } =
    usePagination(items);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader title="My Page" description="Short description" actions={<Button>Action</Button>} />
      {/* content */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="items"
      />
    </div>
  );
}
```

---

## 4. Page-by-page changelog

| Route | Before | After |
|-------|--------|-------|
| `/login` | Centered card only | VAHANPLUS-style: single centered card, mesh bg, logo glow, uppercase brand |
| `/dashboard` | Basic stats | Command-center layout with `PageHeader` |
| `/leads` | Plain table | `PageHeader`, wizard form, mobile cards, `?leadId=` deep links |
| `/assigned` | Raw `<h1>`, edit stub | `PageHeader`, working edit via `LeadForm` |
| `/calendar` | Edit toast | Edit navigates to Lead Pool with deep link |
| `/converted`, `/lost`, `/reports` | Raw `<h1>` | `PageHeader` |
| `/users`, `/companies` | Inline titles | `PageHeader` |
| `/settings` | Raw `<h1>`, no URL tabs | `PageHeader`, `?tab=` sync, `/subscription` opens Subscription tab |
| `/help` | — (broken doc link) | In-app help page |
| Unknown routes | Redirect to dashboard | `NotFound` page |

---

## 5. Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette (search pages) |
| `Tab` (on load) | Skip link to main content |

See also [`/help`](/help) in the running app.

---

## 6. Batch 1 features (detail)

### Lead deep links

- URL: `/leads?leadId=<id>`
- Opens Lead Detail when the lead exists in context
- Closing the dialog removes `leadId` from the URL
- Calendar edit button navigates here

### Mobile lead cards

- Below `md` breakpoint, Lead Pool shows card list instead of table
- Same `paginatedLeads` data and pagination controls

### Settings tab URL sync

- `?tab=general|fields|subscription|billing` updates on tab change (`replace: true`)
- `/subscription` route auto-opens Subscription tab

### Pagination `itemLabel`

- `PaginationControls` accepts `itemLabel` (default: `"items"`)
- Lead Pool: `"leads"`, Users: `"users"`

### LeadForm step validation

- **Next** validates the current wizard step before advancing
- Company fields on step 0; assignment required on step 3

---

## 7. Contrast & accessibility (Phase 2)

### Standard

WCAG 2.1 **AA** — 4.5:1 for normal text, 3:1 for large text and UI icons.

### What changed

- Darkened `--muted-foreground` and `--primary` for safer body/button contrast
- Sidebar labels use explicit hex tokens instead of `color-mix` opacity
- Assigned Leads stat cards use `.stat-surface-*` token pairs (no gradient + muted text)
- Hardcoded `bg-*-100 text-*-800` badges replaced with `.badge-neutral` / `.status-info`
- Empty-state icons use `text-muted-foreground` instead of `opacity-50`
- Admin/report icons use `.text-icon-success`, `.text-icon-warning`, etc.

### Developer rules

1. **Never** pair raw Tailwind `bg-*-50/100` with `text-*-600/800` for readable content — use semantic tokens
2. **Never** reduce text contrast with `opacity-*` or `text-muted-foreground/60` on readable copy
3. Use `placeholder:text-placeholder-foreground` for form placeholders
4. Run `npm run check:contrast` after changing [`src/styles/globals.css`](../src/styles/globals.css)

---

## 8. Product polish & accessibility (Phase 3)

### Onboarding checklist

- [`src/components/OnboardingChecklist.tsx`](../src/components/OnboardingChecklist.tsx) on Dashboard for `company_admin`
- Three steps: add users, import/add leads, assign a lead
- Progress stored in `localStorage` (`lms-onboarding-{userId}`); dismissible

### Dashboard pipeline trend chart

- [`src/components/dashboard/PipelineTrendChart.tsx`](../src/components/dashboard/PipelineTrendChart.tsx)
- 7-day bar chart of new leads by `createdAt` (Recharts, `--chart-1` color token)

### Calendar heat-map

- Day cells use `--calendar-heat-1` through `--calendar-heat-3` by follow-up count (1–2, 3–5, 6+)
- Legend below calendar grid; counts remain in `aria-label` on each day button

### Static a11y checks

```bash
npm run check:a11y
```

Verifies `DialogTitle` in dialog files and `aria-label` on icon-only buttons (feature components only).

### Phase 3 edge-case fixes

- **`loadLeadsForDashboard()`** in [`LeadsContext`](../src/components/LeadsContext.tsx) — Dashboard loads full role-scoped lead set on mount (no pool/assigned view filter)
- **`toLocalDateKey()`** in [`src/utils/dates.ts`](../src/utils/dates.ts) — local timezone for follow-ups today (Dashboard, Calendar, pipeline chart)
- Calendar days with zero follow-ups announce **"no follow-ups scheduled"** in `aria-label`
- Onboarding checklist syncs `localStorage` on user switch; persists `completed` when all steps done
- Dashboard follow-ups today uses `getDirectorFollowUpsForDate` (aligned with Calendar)
- Pool/assigned stat cards use `isLeadInPoolForUser` / `isLeadInAssignedForUser` visibility helpers

---

## 9. Mobile & navigation (Phase 4)

### Mobile card views

- **Assigned Leads** — below `md`, card list with company, status, assignee, follow-up, View/Edit actions (same pagination as table)
- **User Management** — below `md`, card list with name, email, role, company, status, Edit/Delete

### Collapsible desktop sidebar

- [`src/components/Sidebar.tsx`](../src/components/Sidebar.tsx) — collapse toggle (PanelLeft icon), icon rail at `--sidebar-width-collapsed` (3rem)
- State persisted in `localStorage` (`lms-sidebar-collapsed`); tooltips on nav items when collapsed
- Custom sidebar retained (full shadcn `ui/sidebar.tsx` migration still deferred)

### Sales bottom navigation

- [`src/components/layout/MobileBottomNav.tsx`](../src/components/layout/MobileBottomNav.tsx) — fixed bottom bar for `sales_user` on mobile
- Tabs: Lead Pool, Assigned, Calendar, Lost
- Main content gets `pb-16` padding so content is not hidden behind the bar
- Sidebar collapse toggle is desktop-only (`lg+`); **theme switcher lives in AppShell header** (top-right, next to Help)
- Collapse/expand control is in the **sidebar header** (replaces former theme toggle position)
- Collapsed footer: avatar + 40px logout icon only (no cramped multi-button stack)

---

## 11. Accessibility CI (Phase 5)

### Static checks (extended)

```bash
npm run check:a11y    # DialogTitle, icon buttons, skip-link, img alt
npm run check:contrast
```

### E2E axe + keyboard tests

```bash
npm run test:e2e:a11y   # Playwright + @axe-core/playwright
npm run check:all       # static + contrast + e2e a11y
```

**Coverage (smoke routes):**

- `/login` — public page axe scan
- `/dashboard` — mocked `company_admin` session + API routes, axe scan (Recharts excluded)
- `/assigned` — lead detail dialog focus trap + Escape to close

Fixtures: [`e2e/fixtures/auth.ts`](../e2e/fixtures/auth.ts) mocks `/api/auth/me`, `/api/leads`, `/api/users`, branding (including `/api/config/branding/public`), and field config — no live database required in CI.

### GitHub Actions

[`.github/workflows/a11y-ci.yml`](../.github/workflows/a11y-ci.yml) runs on push/PR to `main`: static a11y, contrast, and Playwright axe suite.

---

## 12. Premium visual refresh (Phase 7)

### App canvas mesh background

- [`AppShell.tsx`](../src/components/layout/AppShell.tsx) scroll area uses `.app-surface` + `.app-mesh` blobs (login-inspired aurora, adapted for in-app pages)
- Richer `--background` / `--card` tokens in [`globals.css`](../src/styles/globals.css) (less flat gray slabs)

### Elevated cards + stat surfaces

- `.card-premium` — gradient fill, subtle border, static shadow, radial highlight overlay (no hover glow)
- Stat cards on Dashboard and Super Dashboard use semantic tinted surfaces (cold/warm/hot/converted/primary)
- `.badge-success` variant for vibrant Active status chips

### Sidebar control relocation

- Theme toggle moved to AppShell header (Search → Theme → Help)
- Collapse toggle moved to sidebar header top
- Collapsed logout fixed: dedicated 40×40px icon button with tooltip

### Super Dashboard alignment

- `PageHeader` replaces raw `<h1>`
- Filters wrapped in premium `Card`
- User table uses design tokens (no hardcoded `gray-*` classes)

---

## 12b. Surface consistency (Phase 8)

### Static card treatment (no hover glow)

- Removed `.card-premium:hover` and `--shadow-card-hover` — cards keep depth at rest without animated glow on hover
- Toned down static `--shadow-card`, `--card-border-glow`, and radial overlay opacity for a professional look

### Page rollout

| Page | Changes |
|------|---------|
| Reports | KPI stat cards + chart/table wrappers use `card-premium` + semantic stat surfaces |
| User Management | Stat cards + user table container |
| Company Management | Filter card + top aggregate stat cards |
| Settings | General Settings and Subscription Plans section wrappers |

---

## 12c. Bento dashboards + light sidebar (Phase 9)

### Light theme sidebar

- Light mode `:root` sidebar tokens are white with dark text (no longer forced dark slate)
- Active nav: blue text + right-edge pill indicator (replaces full purple fill)
- Hidden sidebar scrollbar (thin thumb on hover only)
- Profile footer inset card with Settings + Logout links

### Bento card system

- `.card-bento` — white surface, soft shadow, rounded-2xl (reference fintech style)
- `.card-hero` — indigo gradient hero metric with mesh circle overlays
- `BentoStatCard` / `HeroMetricCard` reusable components in [`src/components/dashboard/`](../src/components/dashboard/)
- `.dashboard-bento` grid with `bento-span-2`, `bento-span-3`, `bento-span-full` helpers

### Dashboard layouts

- **Company dashboard** — hero Lead Pool (2 col) + Assigned + Follow-ups; pipeline chart spans 3 cols; follow-ups + quick actions row
- **Super Dashboard** — compact filter strip; hero Total Users; white stat bento cards; clean table card

---

## 12d. Bento admin rollout (Phase 10)

### Phase 9 polish

- `.bento-span-2` activates at md (768px+), not only xl
- Collapsed sidebar shows a small left-edge dot for the active nav item

### Admin page migration

Replaced Phase 8 `card-premium` tinted stat cards with white `BentoStatCard` / `card-bento`:

| Page | Changes |
|------|---------|
| Reports | KPI stats + full `dashboard-bento` grid for charts and performance summary |
| User Management | Stat cards + table container |
| Company Management | Filter strip + top aggregate stat cards |
| Settings | General Settings and Subscription Plans wrappers |
| Onboarding checklist | `card-bento` with subtle primary border on dashboard |

`.card-premium` utility retained in CSS for legacy/edge use but no longer used on admin or dashboard routes.

---

## 12e. Contrast hardening (Phase 11a)

### Audit results

All semantic token pairs in [`src/styles/globals.css`](../src/styles/globals.css) pass **WCAG AA** (4.5:1 body text, 3:1 UI/icons) in both light and dark themes. No token value changes were required.

### Script coverage

[`scripts/check-contrast.mjs`](../scripts/check-contrast.mjs) expanded from 27 to **43 token pairs** plus hero/trend pill checks:

- Badge success, stat converted/primary surfaces, muted-on-card, primary links, popover, sidebar primary button, icon warning/info
- Hero foreground/muted on gradient start stop; trend up/down pill fg/bg (theme-aware via CSS vars)

### Tokenization

- `--hero-gradient-*`, `--hero-foreground`, `--hero-foreground-muted`, `--hero-badge-bg`
- `--stat-trend-up/down-bg/fg` (dark overrides in `.dark`)
- `.card-hero`, `.stat-trend-up/down`, `.text-hero`, `.text-hero-muted`, `.hero-trend-badge` utilities
- [`HeroMetricCard`](../src/components/dashboard/HeroMetricCard.tsx) — removed `text-white/*` opacity classes

### Hardcoded color cleanup

| File | Change |
|------|--------|
| UserManagement | Status dots → `--status-converted-bg` / `--status-lost-bg` |
| HistoryModal | Timeline dots → `--status-active-*` / `--status-updated-*` |
| Reports | Chart fills/strokes → `var(--status-*)` and `var(--chart-*)` |

---

## 12f. Pipeline bento rollout (Phase 11b)

Pipeline pages migrated to match admin/dashboard bento pattern:

| Page | Changes |
|------|---------|
| Lead Pool | KPI strip (total, hot, warm, cold) + `card-bento` table wrapper; virtualized table unchanged |
| Assigned Leads | `BentoStatCard` stats + `card-bento` team distribution and table |
| Converted Leads | 3 KPI bento cards + `card-bento` table |
| Lost Leads | Total lost + lost-this-month KPIs + `card-bento` table |
| Calendar | Month grid and day-detail panels in `card-bento`; heat-map tokens preserved |

---

## 12g. Premium card depth (Phase 12)

### Three-tier card system

| Tier | Class | Use |
|------|-------|-----|
| Hero (deprecated) | `.card-hero` | Retired in Phase 13 — use `BentoStatCard` with `featured` + `eyebrow` |
| Stat variants | `.card-bento-v-{primary,teal,warm,rose,slate}` | All `BentoStatCard` KPI tiles — distinct accent each |
| Content panels | Enhanced `.card-bento` | Tables, charts, filter strips — border-glow, vertical gradient, top highlight |

### BentoStatCard variants

[`BentoStatCard`](../src/components/dashboard/BentoStatCard.tsx) accepts `variant` or `index` (auto-cycles through 5 variants):

- **primary** — diagonal indigo tint + soft top-right glow
- **teal** — reverse diagonal + top inset highlight
- **warm** — warm surface tint + left accent bar
- **rose** — pink tint + bottom-left glow
- **slate** — neutral elevated + inset top highlight

Applied across Super Dashboard, Company Dashboard, Reports, User/Company Management, and all pipeline pages.

---

## 12h. Unified chrome (Phase 13)

### Hero KPI unification

`HeroMetricCard` retired. Featured dashboard metrics use [`BentoStatCard`](../src/components/dashboard/BentoStatCard.tsx) with:

- `featured` — larger value typography, 2-column span via `className="bento-span-2"`
- `eyebrow` — contextual label (e.g. "Platform overview", "Hey, Name")

### Canvas background

Token-driven app canvas in [`globals.css`](../src/styles/globals.css):

- `--canvas-base`, `--canvas-gradient`, `--canvas-radial`, `--canvas-grid`, `--canvas-vignette`
- Layered `.app-surface` with dot grid + refined mesh blobs (light + dark)
- Login mesh aligned to same tokens in [`login.css`](../src/styles/login.css)

### Unified page header

[`PageMetaContext`](../src/components/layout/PageMetaContext.tsx) + `usePageMeta({ title, description, actions })` replaces the former per-page `PageHeader` component.

[`AppShell`](../src/components/layout/AppShell.tsx) renders a two-row sticky chrome:

1. Breadcrumb (`Home / {title}`) + search pill + theme + help
2. Page title, description, and actions

---

## 12i. Follow-up Calendar UX (Phase 14)

### KPI strip

Four [`BentoStatCard`](../src/components/dashboard/BentoStatCard.tsx) metrics: Today, This week, This month, Overdue — computed in [`src/utils/followups/calendar.ts`](../src/utils/followups/calendar.ts).

### Consistent counts

Grid day badges use **deduped-per-lead** counts (same rule as day panel). `aria-label` includes both company and total counts when they differ.

### Day agenda

- [`FollowUpAgendaCard`](../src/components/calendar/FollowUpAgendaCard.tsx) — premium `card-bento` rows with time pill, status badge, overdue accent, `tel:` links
- Hour filter as horizontal chip tabs (`role="tablist"`)
- Auto-selects today on load

### Week view + mobile

- Month / Week toggle; optional Sun/Mon week start
- Week view: 7-day strip with larger cells
- Mobile (`<lg`): bottom [`Sheet`](../src/components/ui/sheet.tsx) for day agenda after date tap
- Keyboard: arrows move selection, Home → today, PageUp/PageDown → prev/next period

### Layout

- Desktop day panel: `sticky top-[calc(var(--app-header-offset)+0.5rem)]`
- `--app-header-offset` token in [`globals.css`](../src/styles/globals.css)

---

## 12j. Reports Shadcn charts (Phase 15)

### Analytics layer

[`src/utils/reports/analytics.ts`](../src/utils/reports/analytics.ts) — pure data builders:

- `filterLeadsByPeriod` / `filterLostLeadsByPeriod` — **Period** dropdown now filters all KPIs and charts
- `buildMonthlyTrend` — real `createdAt` / `convertedAt` aggregation (replaces random simulation)
- `buildStatusDistribution`, `buildTeamPerformance`, `buildPipelineStages`, `buildPerformanceSummary`

### Shadcn chart components

[`src/components/reports/`](../src/components/reports/) — each uses [`ChartContainer`](../src/components/ui/chart.tsx) + theme-aware `--color-*` tokens:

| Component | Chart |
|-----------|-------|
| `MonthlyTrendChart` | Dual-line trend |
| `StatusDistributionChart` | Donut + center total + legend |
| `TeamPerformanceChart` | Grouped bars + skew note when one user dominates |
| `PipelineFunnelChart` | Horizontal pipeline bars with stage colors |

### Performance Summary table

[`PerformanceSummaryTable.tsx`](../src/components/reports/PerformanceSummaryTable.tsx) — Shadcn `Table` on desktop, stacked cards on mobile, inline conversion progress bars.

[`Reports.tsx`](../src/components/Reports.tsx) slimmed to orchestration + KPI bento strip.

---

## 12k. Unified table design (Phase 16)

### Design tokens

Table-specific tokens in [`globals.css`](../src/styles/globals.css): `--table-header-bg`, `--table-row-hover`, `--table-row-stripe`, `--table-border`, `--table-radius`.

### Enhanced primitives

[`ui/table.tsx`](../src/components/ui/table.tsx) — muted header bar, `px-4 py-3` cells, zebra striping, primary-tinted hover, `TableRow variant="interactive"` for clickable rows.

### BentoTable wrapper

[`layout/BentoTable.tsx`](../src/components/layout/BentoTable.tsx) — shared caption strip, scroll container, sticky header support. Used inside existing `card-bento` panels (no double borders).

### Rollout

Lead Pool, Assigned, Converted, Lost, User Management, Company Management, Super Dashboard, Reports Performance Summary, and `LoadingTable` skeleton.

---

## 12l. Reports bento chart layout (Phase 17)

Charts on [`Reports.tsx`](../src/components/Reports.tsx) use asymmetric `dashboard-bento` spans instead of four equal narrow columns:

| Breakpoint | Layout |
|------------|--------|
| default | Single column stack |
| md (768+) | Monthly trend full width; status + pipeline side-by-side; team performance full width |
| xl (1280+) | Monthly trend `bento-span-3` + status donut; pipeline `bento-span-2-xl` + team `bento-span-2`; performance table full width |

Wide charts use `h-[280px] md:h-[300px]`. New utility: `.bento-span-2-xl` (span 2 only at xl).

---

## 12m. Lead Pool pagination + shimmer loading (Phase 18)

### Pagination

- **Lead Pool** — Desktop virtual scroll removed; table and mobile cards both use `paginatedLeads` from [`usePagination`](../../src/hooks/usePagination.ts). [`PaginationControls`](../../src/components/ui/pagination-controls.tsx) shown on all breakpoints.
- **Converted Leads, Lost Leads, Company Management** — Same client-side pagination pattern; page resets when search/sort/filters change.

### Shimmer skeleton loading

- [`globals.css`](../src/styles/globals.css) — `@keyframes shimmer` + `.skeleton-shimmer` (theme-aware)
- [`Skeleton`](../src/components/ui/skeleton.tsx) — `variant="shimmer"` (default) or `"pulse"`
- Primitives: [`LoadingTable`](../src/components/layout/LoadingTable.tsx), [`LoadingCardList`](../src/components/layout/LoadingCardList.tsx), [`LoadingStatCards`](../src/components/layout/LoadingStatCards.tsx)
- Rolled out on Lead Pool, Assigned, Converted, Lost, User Management, and Company Management (replaces full-page spinners)

---

## 13. Enterprise depth (Phase 6)

### 12a. Brand theming / logo upload

- **API** — `GET /api/config/branding/public` (no auth) and extended `PUT /api/config/branding` with `{ systemName?, logoUrl? }` stored in `system_config.globalBranding`
- **Settings** — Super admin can upload/remove logo (PNG/JPG/WebP, max 512KB, base64 data URL)
- **Login** — `LoginBrandPanel` + mobile header show custom logo when set
- **Sidebar** — Super admin sidebar shows uploaded logo instead of default icon

### 12b. Virtualized lead tables (superseded on Lead Pool by Phase 18)

- Lead Pool previously used `@tanstack/react-virtual` on desktop; **Phase 18** replaced this with client-side pagination on all breakpoints (see §12m)
- Mobile card view unchanged

### 12b-alt. Lead Pool pagination (Phase 18)

- Desktop table maps `paginatedLeads` (same slice as mobile cards); no scroll container or sticky virtual rows
- Loading: `LoadingTable` (desktop) + `LoadingCardList` (mobile) while `LeadsContext.isLoading`

### 12c. react-hook-form + zod (LeadForm)

- [`src/components/LeadForm.tsx`](../src/components/LeadForm.tsx) wizard migrated to `react-hook-form` + `zod` schemas per step ([`src/schemas/leadFormSchemas.ts`](../src/schemas/leadFormSchemas.ts))
- Step validation via `form.trigger()` on company and assignment fields; shadcn `Form` primitives for field errors

---

## 14. Known limitations (deferred)

- Full shadcn `ui/sidebar.tsx` migration
- Company-level logo (tenant branding separate from global super-admin logo)
- Calendar drag-reschedule
- Full page-matrix WCAG audit (all routes × roles), virtualized tables
- Full `react-hook-form` + zod migration

---

## 15. Related documentation

- [Page index](pages/README.md)
- [Lead Pool](pages/leads.md)
- [Settings](pages/settings.md)
- [API reference](api-reference.md)
