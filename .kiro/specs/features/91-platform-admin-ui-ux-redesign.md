# Platform Admin UI/UX Redesign — Milestone 14.1

## Visual Principles

- Restrained neutral surfaces with clear typography hierarchy
- Subtle borders, limited elevation (no card shadows by default)
- Information-dense without feeling crowded
- Consistent spacing via theme increments
- Semantic status colors (never color-only)
- Compact metric cards with left-border accent
- Professional SaaS administration aesthetic

---

## Shell Architecture

```text
Desktop:
┌──────────────────────────────────────────────────────┐
│ Sidebar (260px)  │ Top Bar (56px)                    │
│                  ├───────────────────────────────────-┤
│ - Logo/identity  │                                    │
│ - Nav groups     │ Page content (max-width: 1400px)   │
│ - Overview       │                                    │
│ - Management     │                                    │
│ - Billing        │                                    │
└──────────────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────┐
│ Top Bar [☰] ... [email] [out]│
├──────────────────────────────┤
│                              │
│ Page content                 │
│                              │
└──────────────────────────────┘
☰ → Temporary Drawer (sidebar content)
```

---

## Navigation

### Desktop Sidebar
- Persistent, 260px wide
- Dark background (#1a1f2e)
- Grouped: Overview, Management, Billing
- Active state: highlighted background + accent icon color
- Icons + text labels always visible

### Mobile
- Drawer triggered by hamburger icon in top bar
- Same content as desktop sidebar
- Closes on navigation

### Active Route Detection
- Exact match for `/platform` (dashboard)
- Prefix match for nested routes (e.g., `/platform/billing/*` highlights Billing)

---

## Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| 320px | Single column, drawer nav, compact cards |
| 375px | Single column, drawer nav |
| 768px | Two columns for metrics, drawer nav |
| 1024px (md) | Sidebar visible, multi-column grids |
| 1440px | Full layout, 3-4 column metric grids |

---

## Shared Components

| Component | Purpose | Shared? |
|---|---|---|
| `PlatformAdminShell` | Server wrapper, extracts serializable props | Platform-specific |
| `PlatformShellClient` | Client shell with sidebar + top bar | Platform-specific |
| `PlatformSidebar` | Desktop persistent + mobile drawer nav | Platform-specific |
| `PlatformTopBar` | Fixed top bar with identity/menu | Platform-specific |
| `PageHeader` | Title, description, breadcrumbs, action slot | Reusable |
| `MetricCard` | Compact metric with label, value, variant | Reusable |
| `SectionCard` | Bordered content group with optional title | Reusable |
| `PlatformEmptyState` | Empty state with message and optional action | Reusable |
| `StatusChip` | Semantic status label (existing, enhanced) | Shared |

---

## Table Pattern

- MUI Table with `size="small"` for density
- Header cells: 0.75rem, 600 weight, secondary color
- Body cells: 0.8125rem
- Hover rows
- Status displayed via `StatusChip`
- Actions column with text buttons (View, Reconcile)
- Empty state when no rows
- Pagination with page/total info + Previous/Next buttons

---

## Form Pattern

Not heavily used in platform admin (mostly read-only operational views).
Search uses TextField with search icon, form submission for server-side filtering.

---

## Status Pattern

`StatusChip` component maps domain statuses to semantic colors:
- active/success → green
- trialing/info → blue  
- warning/past_due → amber
- error/cancelled → red
- default/inactive → gray

Always shows text label. Never color-only.

---

## Loading/Empty/Error Pattern

- **Empty**: `PlatformEmptyState` with title + description
- **Loading**: Server Components render with data (no client loading spinners for initial page load)
- **Error**: Safe error message, no raw DB errors exposed

---

## Server/Client Boundaries

```text
page.tsx (Server Component)
  → requirePlatformAdmin() — authorization
  → data queries — server-side
  → renders Server Components (PageHeader, SectionCard, MetricCard, tables)

PlatformAdminShell (Server Component)
  → extracts email/role strings
  → passes to PlatformShellClient (Client Component)

PlatformShellClient ("use client")
  → manages mobileOpen state
  → renders PlatformSidebar + PlatformTopBar
```

No functions passed to Client Components. No Supabase clients in client code.

---

## Accessibility

- Sidebar nav has `aria-label="Platform admin navigation"`
- Mobile menu button has `aria-label="Open navigation menu"`
- ListItemButtons have tooltip for collapsed state
- Status communicated via text (not color alone)
- Breadcrumbs use semantic `<nav>` via MUI Breadcrumbs
- Page titles use `component="h1"`
- Tables use semantic `<table>` elements
- Focus states preserved (MUI default focus-visible)

---

## Performance

- All page.tsx remain Server Components (no "use client")
- Client boundary limited to shell (sidebar state management)
- No new heavy dependencies added
- Tenant queries use server-side pagination (LIMIT/OFFSET)
- No unbounded queries
- No client-side data fetching for initial render

---

## Components Removed

| Component | Reason |
|---|---|
| `platform-admin-header.tsx` | Replaced by `platform-top-bar.tsx` |
| `platform-admin-navigation.tsx` | Replaced by `platform-sidebar.tsx` |

---

## Design Tokens

`styles/theme/platform-admin-tokens.ts`:
- Layout constants (SIDEBAR_WIDTH, TOP_BAR_HEIGHT)
- Palette (sidebar, topBar, page, status, metric)
- Typography presets (pageTitle, sectionTitle, cardTitle, body, secondary, caption, metricValue, metricLabel)
- Spacing presets (page, section, card, compact)
- Surface tokens (border, borderRadius, shadow)

Uses the existing MUI theme foundation. No second framework introduced.
