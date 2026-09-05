# Tenant Business App UI/UX Redesign — Milestone 14.2

## Visual Direction

- Modern, warm, professional
- Light sidebar with white background and subtle borders
- Blue accent for active states (consistent with platform admin pattern)
- Grouped navigation with icons + text labels
- Operations-first information hierarchy
- Consistent PageHeader + MetricCard + SectionCard patterns across all pages
- Calmer spacing and restrained surface design

---

## Shell Architecture

```text
Desktop (≥1024px):
┌────────────────────────────────────────────────────────┐
│ Sidebar (240px)     │ Top Bar (52px)                   │
│ ┌─────────────────┐ ├──────────────────────────────────┤
│ │ [Avatar] Name   │ │                                  │
│ │         Role    │ │ Page content (max 1200px)        │
│ ├─────────────────┤ │                                  │
│ │ OVERVIEW        │ │                                  │
│ │  Dashboard      │ │                                  │
│ │  My Day         │ │                                  │
│ ├─────────────────┤ │                                  │
│ │ OPERATIONS      │ │                                  │
│ │  Calendar       │ │                                  │
│ │  Appointments   │ │                                  │
│ │  Customers      │ │                                  │
│ ├─────────────────┤ │                                  │
│ │ BUSINESS        │ │                                  │
│ │  Staff          │ │                                  │
│ │  Services       │ │                                  │
│ │  Resources      │ │                                  │
│ │  Locations      │ │                                  │
│ ├─────────────────┤ │                                  │
│ │ ENGAGEMENT      │ │                                  │
│ │  Reviews        │ │                                  │
│ │  Waitlist       │ │                                  │
│ │  Packages       │ │                                  │
│ ├─────────────────┤ │                                  │
│ │ FINANCE         │ │                                  │
│ │  Payments       │ │                                  │
│ ├─────────────────┤ │                                  │
│ │ MANAGE          │ │                                  │
│ │  Notifications  │ │                                  │
│ │  Health         │ │                                  │
│ │  Team           │ │                                  │
│ │  Settings       │ │                                  │
│ └─────────────────┘ │                                  │
└────────────────────────────────────────────────────────┘

Mobile (<1024px):
┌────────────────────────────┐
│ [☰] Top Bar    [🔔] [out] │
├────────────────────────────┤
│                            │
│ Page content               │
│                            │
└────────────────────────────┘
☰ → Drawer (same sidebar content)
```

---

## Navigation

- **6 groups**: Overview, Operations, Business, Engagement, Finance, Manage
- **18 items** (was 11, now includes: My Day, Staff, Payments, Notifications, Health, Team)
- Active state: blue icon + blue text + light blue background
- Prefix-matching for nested routes
- Role-aware: `roles` field on nav items (not currently restricted but architecture supports it)
- Mobile: Temporary drawer with same content, closes on navigation

---

## Pages Redesigned

| Route | Changes |
|---|---|
| `/{slug}/dashboard` | PageHeader + MetricCards + SectionCard + operations-first hierarchy |
| `/{slug}/my-day` | PageHeader, cleaner unlinked state |
| `/{slug}/calendar` | PageHeader with breadcrumbs + timezone |
| `/{slug}/appointments` | PageHeader with breadcrumbs + count + actions |
| `/{slug}/customers` | PageHeader + search + filter chips + table redesign |
| `/{slug}/services` | PageHeader with breadcrumbs + actions |
| `/{slug}/resources` | PageHeader with breadcrumbs + actions |
| `/{slug}/locations` | PageHeader with breadcrumbs + actions |
| `/{slug}/packages` | PageHeader with breadcrumbs + count |
| `/{slug}/reviews` | PageHeader + MetricCard summary (rating, count, published, pending) |
| `/{slug}/waitlist` | PageHeader with entry count |
| `/{slug}/payments` | PageHeader + per-currency MetricCards + client page |
| `/{slug}/notifications` | PageHeader with unread count |
| `/{slug}/health` | PageHeader + summary MetricCards (blocked/attention/ready) |
| `/{slug}/team` | PageHeader + MetricCards (members, invitations) |
| `/{slug}/settings` | PageHeader + SectionCard layout + settings navigation links |

---

## Design Tokens

`styles/theme/tenant-tokens.ts`:
- TENANT_SIDEBAR_WIDTH: 240px
- TENANT_TOP_BAR_HEIGHT: 52px
- tenantPalette: sidebar (light), topBar, page, accent, status
- tenantTypography: pageTitle, sectionTitle, body, secondary, navItem, navGroup
- tenantSurface: border, borderRadius

---

## Shared Components Reused

From Platform Admin (14.1):
- `PageHeader` — breadcrumbs, title, description, action
- `MetricCard` — compact metric with variants
- `SectionCard` — bordered content container
- `PlatformEmptyState` — empty state messaging
- `StatusChip` — semantic status labels

New for Tenant:
- `TenantSidebar` — grouped navigation with icons
- `TenantTopBar` — minimal with notifications shortcut
- `BusinessShell` — rewritten to combine sidebar + topbar + content

---

## Server/Client Boundaries

All `page.tsx` remain Server Components:
- `requireTenantMember()` / `requireTenantRole()` for auth
- Data queries run server-side
- Only serializable DTOs passed to client pages

Client components (`"use client"`):
- `BusinessShell` — manages mobile drawer state
- `TenantSidebar` — uses `usePathname()` for active state
- `TenantTopBar` — menu click handler
- Existing `*ClientPage` components preserved unchanged

---

## Accessibility

- Sidebar: `nav[aria-label="Business navigation"]`
- Menu button: `aria-label="Open navigation menu"`
- Notification shortcut: `aria-label="Notifications"`
- Page titles: `component="h1"` via PageHeader
- Status: always text labels, not color-only
- Tables: semantic `<table>` elements
- Drawer: MUI `Drawer` with keyboard/focus management

---

## Performance

- No new data queries introduced
- No unbounded queries
- Server Components preserved (no "use client" on pages)
- Client boundary limited to shell + existing interactive pages
- Single new dependency: `@mui/icons-material` (already installed for 14.1)
- No chart library introduced
- No client-side data fetching for initial render

---

## E2E Tests

`tests/e2e/tenant-shell.spec.ts`:
- All 16 routes render without 500
- Desktop sidebar visible
- Dashboard shows page header
- Settings shows business details
- No RSC boundary errors across navigation
- Mobile: sidebar hidden, menu button visible, drawer opens
- Mobile: no horizontal overflow on 5 key pages
- Authorization: unauthenticated blocked

---

## Responsive Audit

| Viewport | Status |
|---|---|
| 320px | Content stacks vertically, drawer nav, no overflow |
| 375px | Same, cards 2-column where applicable |
| 768px | Drawer nav, wider metric grids |
| 1024px | Sidebar appears, multi-column layouts |
| 1440px | Full layout with comfortable spacing |
