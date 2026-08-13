# Customer Booking Experience 2.0

> Milestone 15.12 — Integration + UX milestone bringing existing backend infrastructure together into a polished customer-facing booking journey.

## Architecture

### Single Canonical Booking Engine

No second booking engine, availability engine, payment lifecycle, gift-card ledger, package ledger, or recurrence engine was introduced. All new code calls existing authoritative services.

### Step Flow

```
Service → Location → Date & Time → Recurrence (optional) → Customer Details → Payment (conditional) → Review → Confirmation
```

Steps are dynamically configured:
- **Recurrence step**: Shown when `recurringEnabled` prop is true
- **Payment step**: Shown when service has a price AND (gift cards enabled OR online payment available OR package options exist) AND booking is NOT recurring

### Key Files

| Area | File |
|------|------|
| Flow orchestration | `features/public-booking/components/public-booking-flow.tsx` |
| Service action | `features/public-booking/actions/create-public-booking-action.ts` |
| Series action | `features/public-booking/actions/create-public-series-action.ts` |
| Gift card validation | `features/public-booking/actions/validate-gift-card-action.ts` |
| Gift card service | `features/gift-cards/services/gift-card-redemption-service.ts` |
| Package eligibility | `features/public-booking/actions/get-eligible-packages-action.ts` |
| Payment step UI | `features/public-booking/components/public-payment-step.tsx` |
| Recurrence step UI | `features/public-booking/components/public-recurrence-step.tsx` |
| Confirmation | `features/public-booking/components/public-booking-confirmation.tsx` |
| ICS export | `features/public-booking/utils/generate-ics.ts` |
| Types | `features/public-booking/types/public-booking.ts` |

## Availability

- Uses existing `calculateAvailability` service
- Server rechecks availability at final submission (slot race protection)
- "Any resource" resolved server-side via existing resource eligibility logic
- Tenant timezone remains scheduling authority
- Next available date assistance via existing availability infrastructure

## Resource Preference

- Specific resource selection supported
- "Any available" uses server-authoritative resolution
- Browser-provided resourceId always revalidated server-side

## Timezone

- All scheduling in tenant timezone
- Customer sees local appointment time
- Recurring series generated in tenant timezone (DST-safe via `fromZonedTime`)

## Guest / Customer Identity

- **Guest booking**: No authentication required. Customer enters name/email/phone
- **Authenticated customer**: Portal session cookie (magic-link auth). Identity from server session only
- Customer IDs from browser are never used as authorization
- Prefill from portal session when available

## Payments

### Available Methods
- **Pay at business** (default)
- **Online payment** (when configured via Polar)
- **Package credit** (when authenticated customer has eligible credits)
- **Gift card** (when enabled + valid code entered)

### Online Payment Flow
- Webhook-authoritative (payment success ONLY via provider webhook)
- Browser redirects do NOT mark payments paid
- Payment pending ≠ paid

### Idempotency
- `claim_public_booking_request` RPC prevents duplicate appointments
- Unique idempotency key per submission attempt
- New key generated on retryable errors (slot taken, details changed)

## Packages

### Eligibility
- `getEligiblePackagesForBooking(tenantId, customerId, serviceId)` — canonical service
- Customer identity from portal session cookie (server-authoritative)
- Checks: active status, non-expired, sufficient credits, service eligibility

### Reservation
- `reservePackageCredits` RPC with row-level locking
- Tied to `appointmentId` after creation

### Failure Recovery
- Credits reserved only AFTER appointment creation succeeds
- If appointment fails, no credits are consumed

### Concurrency
- Database RPC uses `FOR UPDATE` row locking
- Two simultaneous bookings cannot consume the same credit

## Gift Cards

### Validation
1. Raw code → SHA-256 hash (via `hashGiftCardCode`)
2. Lookup by `code_hash` + `tenant_id` (tenant-scoped)
3. Check status, expiry, balance, currency, `allow_appointment_redemption`

### Code Security
- Raw code NEVER stored in database, server logs, or audit logs
- Only SHA-256 hash persisted
- Generic "invalid code" for cross-tenant attempts (no information leak)
- Code cleared from UI state immediately after validation

### Reservation
- `gift_card_reservations` table with 15-minute expiry
- Available balance = `current_balance` minus active reservations
- Confirmed after appointment creation succeeds
- Released on booking failure or reservation expiry

### Redemption
- Ledger debit entry on confirmation
- Cached `current_balance` updated
- Card status set to `fully_redeemed` when balance reaches 0

### Release
- Automatic on booking failure
- Automatic on expiry (15 minutes)
- Explicit on customer removal from UI

### Partial Value
- Gift card covers up to service price (min of balance vs price)
- Remaining amount: "pay at business" (split tender within canonical model)
- Balance cannot go negative (`gc_balance_non_negative` constraint)

### Concurrency
- Active reservations deducted from available balance
- Two concurrent checkouts cannot spend same remaining value
- Database constraint prevents negative balance

### Tenant Isolation
- Lookup requires matching `tenant_id`
- Cross-tenant code returns generic "invalid" (same as nonexistent)

## Recurring Appointments

### UI
- Customer-friendly step: "Does not repeat" / Daily / Weekly / Monthly
- Interval selection (1–12)
- Weekly: day-of-week multi-select chips
- Monthly: day-of-month input
- Occurrence count (2–52)
- Generated dates preview

### Summary
- Human-readable: "Every Tuesday at 10:00"
- Date range: "Aug 18 – Sep 22"
- Occurrence count displayed

### Conflict Behavior
- Every occurrence checked against existing appointments before creation
- ANY conflict rejects the ENTIRE series (all-or-nothing)
- Conflicting dates returned to customer

### Restrictions (Milestone 15.1 policies)
- Recurring = pay-at-business ONLY
- Online payment disabled for series
- Package credits disabled for series
- Gift cards disabled for series
- Payment step hidden when recurring selected

### Atomicity
- Series row + all appointment rows created in single operation
- On appointment insert failure → series row rolled back
- Idempotency key prevents duplicate series

## Confirmation

### Displayed Data
- Appointment/series number
- Business name, service, location, resource
- Local date/time with day-of-week formatting
- Duration, price, timezone
- Payment method summary
- Gift card application details
- Package credit details
- Recurrence summary + occurrence count
- Custom confirmation message
- Email/reminder status

### Calendar Export (ICS)
- RFC 5545 compliant
- Proper CRLF line endings
- DateTime in UTC format (YYYYMMDDTHHMMSSZ)
- Escaped special characters (semicolons, commas, backslashes, newlines)
- Includes: title, location, start/end, description, organizer
- Does NOT include: internal notes, appointment IDs, customer PII beyond name
- Unique UID per event
- Browser download trigger via Blob URL

### Management Links
- "Book another appointment" → `/book/{tenantSlug}`
- Customer portal accessible via existing magic-link infrastructure

## Feature Overrides

### Integrated Features
- `gift_cards` — controls gift card redemption visibility
- `online_payments` — controls online payment option
- `public_booking` — controls entire booking availability

### Effective State Behavior
- Platform override (non-expired) takes precedence over tenant setting
- Expired overrides fall through to tenant preference
- Tenant preference is NEVER overwritten — only shadowed

## Branding

- Published configuration only (`resolvePublishedTenantTheme`)
- Draft branding never exposed publicly
- Tenant-scoped (A branding cannot appear on B)
- Fallback theme for tenants without custom branding
- Accessible contrast maintained

## Security

- **Tenant isolation**: All queries tenant-scoped, RLS intact
- **Customer identity**: Server session only, never browser-provided IDs
- **Financial authority**: Webhook-authoritative payments, server-authoritative balances
- **Secrets/PII**: No service-role keys in browser, no raw gift card codes in logs
- **Idempotency**: Server-side duplicate prevention (not just disabled buttons)
- **Input validation**: All IDs revalidated server-side at submission

## Performance

- **RSC boundaries**: Storefront page is Server Component, wizard is Client Component
- **Query bounds**: Services capped, availability per-date, reviews limited
- **Images**: Next.js optimized images where applicable
- **Client JS**: Only interactive booking state requires client JS
- **Availability**: Single date fetched at a time (not months)

## Analytics

No external analytics SDK added. Server action logger instruments high-value operations:
- `public_booking.create`
- `public_booking.gift_card_validate`
- `public_booking.recurring_create`

Privacy: No customer PII, no gift card codes, no payment tokens in log metadata.

## Mobile

- Tested at 320px, 375px, 390px, 768px, 1024px, 1440px
- No horizontal overflow at any viewport
- Touch-friendly buttons and form controls
- Responsive step layout
- Price text does not overflow

## Tests

### Unit Tests (26 new)
- `features/public-booking/__tests__/generate-ics.test.ts` — 12 tests
- `features/public-booking/__tests__/booking-payment-resolution.test.ts` — 14 tests

### E2E Tests
- `tests/e2e/public-booking.spec.ts` — comprehensive coverage:
  - Basic flow, guest journey
  - Gift card (code not in page source)
  - Recurring appointments
  - Double-submit protection
  - Branding isolation
  - Platform feature overrides
  - Mobile viewports (320/375/390)
  - SEO metadata
  - Security (no secrets/JWTs/env vars in page)

## Limitations

- **Split tender**: Gift card partial payment + remaining = pay at business only (no split online payment)
- **Recurring + payment**: Series bookings are pay-at-business only per Milestone 15.1 policies
- **Package credits for series**: Not supported (would require reserving N credits atomically)
- **Gift card for series**: Not supported (single redemption model)
- **Self-service management**: Token-based management link infrastructure exists but link not yet surfaced on confirmation
- **Real-time availability**: Polling-based (no WebSocket push when slots become available)
