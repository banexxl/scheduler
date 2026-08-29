# Premium Dashboard Redesign — Implementation Plan

## Status: In Progress

### What's Done
- ✅ Design tokens (`styles/theme/dashboard-tokens.ts`)
- ✅ Global MUI dark theme (`styles/theme/theme.ts`)
- ✅ Tenant token files updated to dark (`tenant-tokens.ts`, `platform-admin-tokens.ts`)
- ✅ 9 reusable dashboard components (`components/dashboard/`)
- ✅ Platform Admin Dashboard redesigned (`app/platform/premium-dashboard.tsx`)
- ✅ Tenant Dashboard redesigned (`app/(dashboard)/[tenantSlug]/dashboard/premium-dashboard.tsx`)
- ✅ Shared components updated (PageHeader, SectionCard, MetricCard, EmptyState, ConfirmDialog)

### What Remains
Each page below needs to be redesigned one at a time.

---

## Foundation (Already Applied)

### Design Language
- **Background**: `#0a0a0f` (primary), `#111118` (secondary), `#16161e` (cards)
- **Accent**: `#7C3AED` (purple), `#8B5CF6` (light), `#6D28D9` (dark)
- **Text**: `#f0f0f5` (primary), `#8b8b9e` (secondary), `#5c5c72` (muted)
- **Borders**: `rgba(255, 255, 255, 0.06)` subtle, `0.08` default, `0.12` hover
- **Radius**: 12px (buttons/inputs), 16px (cards), 20px (dialogs), 24px (large sections)
- **Typography**: Inter, -0.02em letter-spacing on headings, 700 weight

### Animation Rules (Framer Motion)
- Page entrance: `opacity: 0→1, y: 16→0, duration: 250ms`
- Cards: stagger `50ms` between siblings
- Hover: `translateY(-4px)`, border glow
- Dialogs: `opacity + scale(0.95→1)`
- Numbers: count-up via `useSpring`
- Respect `prefers-reduced-motion`

---

## Page Redesign Order

### Phase 1: Layout Shells (Highest Impact)
These wrap ALL pages, so updating them affects everything at once.

#### 1. Tenant Sidebar (`features/business/components/tenant-sidebar.tsx`)
- Dark background `#0e0e14`
- Purple active state `#1e1a2e` bg + `#8B5CF6` icon
- Muted text `#8b8b9e`, active text `#f0f0f5`
- Subtle border-right `rgba(255,255,255,0.06)`
- Group labels `#5c5c72`

#### 2. Tenant Top Bar (`features/business/components/tenant-top-bar.tsx`)
- Dark background `#111118`
- Bottom border `rgba(255,255,255,0.06)`
- White text, muted email
- Purple notification badge

#### 3. Business Shell (`features/business/components/business-shell.tsx`)
- Content area bg `#0a0a0f`
- Already uses `tenantPalette.page.bg` — token change cascades

#### 4. Platform Admin Sidebar (`features/platform/components/platform-admin-sidebar.tsx`)
- Already dark (`#1a1f2e`) — update to match new `#0e0e14`

#### 5. Platform Admin Top Bar
- Match tenant top bar dark style

---

### Phase 2: High-Traffic Pages

#### 6. Calendar (`app/(dashboard)/[tenantSlug]/calendar/`)
- Dark grid background
- Purple selected day state
- Dark appointment blocks with status color left-border
- Glass toolbar with dark selects
- Dark current-time indicator line (purple)
- Appointment drawer with dark Paper

#### 7. Appointments List (`app/(dashboard)/[tenantSlug]/appointments/`)
- Dark data table with glass container
- Soft row separators `rgba(255,255,255,0.06)`
- Status chips (keep MUI chip colors, they adapt to dark mode)
- Search toolbar with dark inputs
- Purple focus rings on filters
- Animated row hover `rgba(255,255,255,0.02)`

#### 8. My Day (`app/(dashboard)/[tenantSlug]/my-day/`)
- Dark timeline cards
- Purple time markers
- Glass metric cards for today stats
- Animated appointment blocks

---

### Phase 3: Management Pages

#### 9. Customers (`app/(dashboard)/[tenantSlug]/customers/`)
- Dark CRM-style layout
- Top metric cards (total, new, returning)
- Dark customer table
- Customer detail drawer with dark Paper

#### 10. Staff (`app/(dashboard)/[tenantSlug]/staff/`)
- Dark staff cards with avatar
- Purple active/online indicator
- Hover lift animation
- Role badge chip

#### 11. Services (`app/(dashboard)/[tenantSlug]/services/`)
- Dark service cards in responsive grid
- Duration + price badges
- Active/inactive status chip
- Hover elevation

#### 12. Resources (`app/(dashboard)/[tenantSlug]/resources/`)
- Same card pattern as Services
- Availability indicator dots

#### 13. Locations (`app/(dashboard)/[tenantSlug]/locations/`)
- Dark location info cards
- Address, phone, working hours
- Primary location badge
- Edit actions

---

### Phase 4: Settings & Config Pages

#### 14. Settings Index (`app/(dashboard)/[tenantSlug]/settings/`)
- Dark SectionCard with link buttons
- Danger zone with dark red accent

#### 15. Branding Settings (`settings/branding/`)
- Dark preview panel
- Color pickers on dark surface
- Preview card with dark Paper

#### 16. Templates Settings (`settings/templates/`)
- Dark template cards
- Purple active badge
- Preview modal with dark backdrop

#### 17. Booking Settings (`settings/booking/`, `settings/public-booking/`)
- Dark form sections
- Purple toggle switches
- Dark input fields

#### 18. Billing Settings (`settings/billing/`)
- Dark subscription card
- Plan comparison on dark surface
- Polar integration badges

---

### Phase 5: Engagement Pages

#### 19. Reviews (`app/(dashboard)/[tenantSlug]/reviews/`)
- Dark review cards
- Purple star highlights
- Rating distribution bars on dark
- Reply action with dark textarea

#### 20. Campaigns (`app/(dashboard)/[tenantSlug]/campaigns/`)
- Dark campaign cards
- Status indicators
- Performance metric badges

#### 21. Automations (`app/(dashboard)/[tenantSlug]/automations/`)
- Dark workflow cards
- Connected node aesthetic (visual only)

#### 22. Waitlist (`app/(dashboard)/[tenantSlug]/waitlist/`)
- Dark queue interface
- Priority badges
- Animated call-next button

#### 23. Packages (`app/(dashboard)/[tenantSlug]/packages/`)
- Dark package cards (pricing-style)
- Progress bars with purple fill
- Session counters

#### 24. Referrals (`app/(dashboard)/[tenantSlug]/referrals/`)
- Dark metric cards
- Referral table

---

### Phase 6: Finance Pages

#### 25. Payments (`app/(dashboard)/[tenantSlug]/payments/`)
- Dark finance dashboard
- Revenue metric cards
- Transaction table with status colors
- Polar subscription indicator

#### 26. Gift Cards (`app/(dashboard)/[tenantSlug]/gift-cards/`)
- Dark gift card catalog
- Visual cards with remaining balance
- Purple accent on active cards

---

### Phase 7: Site & Homepage Builder

#### 27. Homepage Builder (`app/(dashboard)/[tenantSlug]/site/homepage/`)
- Dark accordion sections
- Glass cards for each section editor
- Purple visibility chips

---

### Phase 8: Platform Admin Pages

#### 28. Platform Tenants (`app/platform/tenants/`)
- Dark tenant table
- Status badges
- Search + filters

#### 29. Platform Billing (`app/platform/billing/`)
- Dark subscription management
- Order table
- Webhook status

#### 30. Platform Operations (`app/platform/operations/`)
- Dark system health cards
- Log viewer with monospace on dark

---

## Shared Component Patterns

### Forms
- Dark outlined inputs with `rgba(255,255,255,0.08)` borders
- Purple focus: `#7C3AED` border
- Rounded 12px
- Helper text in `#5c5c72`
- Primary button: purple gradient
- Secondary button: outlined with `rgba(124,58,237,0.3)` border
- Danger button: red variant

### Tables
- Container: dark Paper with `#16161e` bg, 16px radius
- Header: sticky, uppercase labels in `#8b8b9e`
- Rows: `rgba(255,255,255,0.06)` separators
- Hover: `rgba(255,255,255,0.02)` bg
- Status pills: MUI Chip colors (auto-adapt to dark)

### Dialogs
- Dark Paper bg `#16161e`
- Rounded 20px
- Backdrop blur 8px
- Scale + fade animation

### Empty States
- Centered icon (48px, muted)
- Title in `#f0f0f5`
- Description in `#8b8b9e`
- CTA button with purple outline

---

## How to Apply Per Page

For each page:
1. Open the page component
2. The MUI theme change (`theme.ts`) already gives dark mode to all MUI components
3. The token changes cascade to components using `tenantPalette`, `platformPalette`, etc.
4. Fix any **hardcoded colors** (e.g., `#ffffff`, `#f9fafb`, `#1f2937`, `#6b7280`) to use theme/token values
5. Replace `bgcolor: "#fff"` with `bgcolor: "background.paper"` or token equivalents
6. Add framer-motion entrance animations where appropriate
7. Test the page visually

Most pages will look 80% correct from the global theme change alone. The per-page work is mostly fixing hardcoded colors and adding animations.
