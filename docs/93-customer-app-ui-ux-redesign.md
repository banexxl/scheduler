# Customer App UI/UX Redesign — Milestone 14.3

## Visual Direction

- Simple, calm, trustworthy
- Mobile-first (680px max width)
- Consumer-friendly, not admin-like
- Softer surfaces, subtle card shadows, generous radius (12px)
- Large touch targets, friendly typography
- Next-appointment-first hierarchy

---

## Route Inventory

| Route | Status |
|---|---|
| `/customer` | Redesigned — greeting + next appointment + stats + businesses |
| `/customer/appointments` | Created — tabbed (Upcoming/Past/Cancelled) card list |
| `/customer/businesses` | Created — linked business cards with Book CTA |
| `/customer/rewards` | Created — per-business reward cards (placeholder) |
| `/customer/payments` | Created — empty state shell |
| `/customer/communications` | Created — empty state shell |
| `/customer/account` | Created — profile, connected businesses, links |
| `/customer/login` | Existing (uses `/login`) |
| `/book/{slug}` | Existing — not redesigned (14.4) |
| `/book/{slug}/portal` | Existing — not redesigned (14.4) |
| `/book/{slug}/review/{token}` | Existing — not redesigned (14.4) |
| `/book/{slug}/waitlist/{token}` | Existing — not redesigned (14.4) |
| `/manage-appointment/{token}` | Existing — not redesigned (14.4) |

---

## Customer Shell

```text
┌─────────────────────────────────┐
│ [My Account]        [Avatar ▾]  │  Top bar (56px)
├─────────────────────────────────┤
│                                 │
│  Content (max 680px, centered)  │
│                                 │
├─────────────────────────────────┤
│ Home Appts Biz Rewards Account  │  Bottom nav (mobile only)
└─────────────────────────────────┘
```

- **Desktop**: Top bar + centered content, no bottom nav
- **Mobile**: Top bar + content + bottom navigation (5 items)
- **Avatar menu**: Account Settings, Payments, Communications, Sign out
- **Layout**: Server Component wraps all `/customer/*` pages with auth + shell

---

## Dashboard (`/customer`)

1. Greeting (personalized or "Welcome back")
2. **Next appointment card** (most prominent) — service, date/time, business, location
3. Quick stats row (Upcoming count, Businesses count)
4. Linked businesses list with Book buttons
5. Empty state when no upcoming appointment

---

## Appointments (`/customer/appointments`)

- Full-width tabs: Upcoming / Past / Cancelled
- Card-based (not table) — each card shows:
  - Service name, date/time, business, location, status chip
- Empty states per tab
- Server-side filter via `?filter=upcoming|past|cancelled`

---

## Businesses (`/customer/businesses`)

- Linked business cards: name, linked date, "Book" button
- Empty state for new accounts

---

## Rewards (`/customer/rewards`)

- Per-business sections (never aggregates across tenants)
- Placeholder for loyalty points and package credits
- Empty state

---

## Payments (`/customer/payments`)

- Empty state shell (ready for payment history query)
- Will show: business, date, type, amount, status, receipt

---

## Communications (`/customer/communications`)

- Empty state shell (ready for history + preferences)
- Will show: per-business preferences for reminders, reviews, waitlist

---

## Account (`/customer/account`)

- Profile section (name, email)
- Connected businesses list
- Navigation links to Payments and Communications

---

## Design Tokens (`styles/theme/customer-tokens.ts`)

- `CUSTOMER_TOP_BAR_HEIGHT`: 56px
- `CUSTOMER_MAX_WIDTH`: 680px
- `customerPalette`: softer surfaces (#fafafa bg), subtle borders (#f0f0f0), card shadow, 12px radius
- `customerTypography`: greeting, sectionTitle, cardTitle, body, meta, caption
- `customerSpacing`: generous padding

---

## Shared Components

| Component | Status |
|---|---|
| `CustomerShell` | New — top bar + bottom nav + content |
| `StatusChip` | Reused from existing |
| Customer appointment card | Inline in client-page (can be extracted later) |

---

## Server/Client Boundaries

- `layout.tsx` — Server Component (auth + account loading)
- `page.tsx` — Server Components (data queries)
- `client-page.tsx` — Client Components (interactive UI: tabs, menus)
- Only serializable props cross boundaries (strings, arrays of plain objects)
- No `component={Link}` function references

---

## Accessibility

- Bottom navigation uses MUI `BottomNavigation` (proper roles)
- Avatar menu uses MUI `Menu` (keyboard/focus management)
- Status communicated via text labels (not color alone)
- Touch targets: bottom nav 64px height, cards minimum 44px tap area
- Page titles in typography hierarchy

---

## Privacy

- Only linked business data shown (never by email alone)
- No internal notes/provider IDs/server logs exposed
- Portal remains tenant-scoped
- Global customer app doesn't aggregate loyalty/packages across tenants

---

## Performance

- All pages Server Components (no client-side data fetching for initial render)
- Bounded queries (limit 25 for appointments)
- Layout loads account once, shared across routes
- Single new component file (CustomerShell) — no heavy dependencies

---

## E2E Tests (`tests/e2e/customer-shell.spec.ts`)

- All 7 customer routes render without 500
- Dashboard shows greeting/content or login redirect
- Appointments shows tabs
- Businesses shows cards or empty state
- Account shows profile
- Mobile: no horizontal overflow
- Authorization: unauthenticated redirected
- Runtime: no RSC/hydration errors

---

## Explicit Confirmations

- Permanent customer access based on active tenant links, not email alone
- Portal remains tenant-scoped and token/session authorized
- Customer account and tenant portal remain distinct
- Global customer app does not aggregate loyalty/packages across tenants
- Payment success remains webhook-authoritative
- Customer UI never exposes internal notes/provider IDs/server logs
- `page.tsx` files remain Server Components
- Client pages receive serializable DTOs only
- `Functions cannot be passed directly to Client Components` does not reproduce
- No N+1 queries introduced
- Mobile flows work at 320–430px
- No second UI framework introduced
- No tenant-controlled branding implemented yet
- Global `/customer` UI does not inherit tenant theme
- No marketplace/discovery implemented
- No new payment/recurring appointment functionality
