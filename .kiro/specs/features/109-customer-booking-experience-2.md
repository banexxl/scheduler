# Customer Booking Experience 2.0

> Milestone 15.12 — Integration + UX milestone. Single canonical booking engine preserved.

## Architecture

No second booking engine, availability engine, payment lifecycle, gift-card ledger, package ledger, or recurrence engine introduced. All new code calls existing authoritative services.

### Step Flow

Calendar-first ordering (redesign 2.1):

```
Service → Date (calendar) → Location → Time → Recurrence (optional) → Customer Details → Payment (conditional) → Review → Confirmation
```

Selecting a date on the calendar opens location selection, then time-slot
selection. Steps transition with fade in/out animations. The "Book an
Appointment" surface uses a dark purple glass theme consistent with the rest
of the public page.

### Key Files

| Area | File |
|------|------|
| Flow | `features/public-booking/components/public-booking-flow.tsx` |
| Calendar step | `features/public-booking/components/public-calendar-step.tsx` |
| Time step | `features/public-booking/components/public-time-step.tsx` |
| Location step | `features/public-booking/components/public-location-step.tsx` |
| Shell (dark glass) | `features/public-booking/components/public-booking-shell.tsx` |
| Booking action | `features/public-booking/actions/create-public-booking-action.ts` |
| Series action | `features/public-booking/actions/create-public-series-action.ts` |
| Gift card validation | `features/public-booking/actions/validate-gift-card-action.ts` |
| Gift card service | `features/gift-cards/services/gift-card-redemption-service.ts` |
| Package eligibility | `features/public-booking/actions/get-eligible-packages-action.ts` |
| Payment step | `features/public-booking/components/public-payment-step.tsx` |
| Recurrence step | `features/public-booking/components/public-recurrence-step.tsx` |
| Confirmation | `features/public-booking/components/public-booking-confirmation.tsx` |
| ICS export | `features/public-booking/utils/generate-ics.ts` |

> The former combined `public-date-time-step.tsx` was split into
> `public-calendar-step.tsx` (month calendar) and `public-time-step.tsx`
> (grouped morning/afternoon/evening slots).

## Gift Cards

- SHA-256 hash lookup, raw code never stored/logged
- Reservation with 15-min expiry, confirmed on booking success, released on failure
- Tenant-scoped (cross-tenant = generic "invalid")
- Partial value supported (remainder = pay at business)
- Concurrency safe via reservation deduction from available balance

## Packages

- Server-authoritative balance via `getEligiblePackagesForBooking`
- Customer identity from portal session cookie (never browser-provided)
- Reserve via RPC after appointment creation succeeds
- Row-level locking prevents double-spend

## Recurring

- Reuses `generateRecurringOccurrences` + `formatRecurrenceSummary`
- All-or-nothing creation (conflict on any date rejects series)
- Pay-at-business only (online/package/gift-card disabled per 15.1 policies)
- Idempotency key prevents duplicate series

## Confirmation + ICS

- Enhanced display: payment method, gift card details, recurrence summary
- RFC 5545 ICS download with proper escaping and UTC datetimes
- No internal notes/IDs exposed in calendar export

## Security

- Tenant isolation (all queries scoped), RLS intact
- Customer identity from server session only
- Financial authority: webhook-only payment confirmation
- No service-role keys/JWTs in browser
- Idempotency server-side (not just disabled buttons)

## 2.1 Redesign, Public Page & Portal Integration

### Booking flow redesign

- Calendar-first flow: **Service → Date → Location → Time → …** (see Step Flow above).
- New `public-calendar-step.tsx`: month calendar with prev/next navigation, past
  dates disabled, today outlined, selected date emphasized, fade/scale on month change.
- New `public-time-step.tsx`: slots grouped morning/afternoon/evening, fade-in on
  load, "next available" fallback search.
- `public-booking-flow.tsx`: each step wrapped in a keyed MUI `Fade` for in/out
  transitions; dynamic step labels passed to the shell (stepper no longer hardcoded).
- `public-booking-shell.tsx`: dark purple glass surface (`rgba(22,22,30,0.55)` +
  blur), purple gradient header, scoped light-on-dark overrides for nested MUI
  inputs, chips, alerts, and stepper.

### Public page (`app/book/[tenantSlug]/page.tsx`)

- Section order: homepage sections → Reviews → **Book an Appointment** → FAQ →
  Gift Cards → Contact → Locations (locations last, contact near the bottom).
- Service cards centered within the Services section.

### Dark theme across all `/book` surfaces

- Template shells (`minimal`, `bold`, `elegant`) render a dark `#0a0a0f` background.
- Portal dashboard + subpages (`appointments`, `account`, `rewards`) use the shared
  `features/customer-portal/components/PortalPageShell.tsx` dark-glass wrapper.
- Standalone pages (`review/[token]`, `waitlist/[token]`, `services/[serviceSlug]`,
  `staff/[staffId]`, `locations/[locationSlug]`) converted to dark surfaces.

### Portal home cards (`/book/[tenantSlug]/portal`)

- `tenant-details-card.tsx`: business details (logo, name, tagline, description,
  address, phone, email, website, social links) read from `TenantThemeProvider`.
- `customer-account-card.tsx`: logged-in customer's global `customer_accounts`
  details (avatar, name, verified chip, member since, email, phone, language).
  DTO excludes internal fields (`id`, `user_id`, `is_active`).

### Header navigation (route-based)

`features/customer-portal/hooks/usePortalNavigation.ts` picks the nav set by the
current route (not auth state):

- **Outside `/portal`:** logo + "Home" → `/book/{slug}`; storefront section anchors
  (Services, Staff, Locations, Reviews, Contact) gated by configured sections.
- **On `/portal*`:** logo + "Home" → `/book/{slug}/portal`; Appointments, Rewards,
  Account. The redundant "My Account" header button was removed in favor of a
  "Book" button (→ `/book/{slug}#booking`).

### Customer ↔ tenant linking fix

`customer-login-action.ts` now calls the shared
`features/customer-portal/services/auto-link-customer.ts` (which creates the
`tenant_customers` row + `customer_account_tenant_links` bridge when missing),
so a freshly registered customer is reliably associated with the tenant on first
login, regardless of email-confirmation timing.

### Public read via service-role (RLS)

`services`, `service_locations`, `service_resources`, and
`tenant_public_booking_settings` grant SELECT only to active tenant members. Public
visitors and logged-in customers (non-members) therefore read nothing under RLS,
which previously hid the booking wizard and returned "Online Booking Unavailable".

Fix: public catalog readers use the service-role client (matching
`resolvePublicSite`), keeping queries strictly tenant-scoped and exposing only
public-safe fields — no RLS policies were weakened:

- `features/public-booking/services/public-service-discovery.ts`
- `features/public-booking/services/public-tenant-resolver.ts`
