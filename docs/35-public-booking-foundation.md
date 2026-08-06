# 35 — Public Booking Flow Foundation (Milestone 6.11)

## Overview

A tenant-branded public booking flow that allows customers to select a service, location, resource preference, date, time, and provide contact details before creating an appointment. Reuses the existing availability engine, booking rules, and conflict-safe atomic insertion.

---

## Public Route Architecture

```
/book/{tenantSlug}              — Service selection + full booking flow
```

Separate from authenticated business routes. No auth required. Minimal layout.

---

## Public Tenant Resolution

`resolvePublicBookingContext(slug)`:
- Resolves tenant by slug (active only)
- Loads public booking settings
- Returns null if tenant inactive or booking disabled
- Exposes only: id, slug, name, defaultTimeZone, logoUrl, coverUrl, description

---

## Booking Settings

`tenant_public_booking_settings` (one row per tenant):
- `is_enabled` — master toggle
- `allow_resource_selection` — show resource picker
- `allow_no_preference` — allow "any available" option
- `show_service_prices` / `show_service_duration` / `show_resource_names`
- `booking_page_title` / `booking_page_description` / `confirmation_message`

Managed via `/{tenantSlug}/settings/public-booking` (owner/admin only).

---

## Service Eligibility

A service appears publicly when ALL:
- Service is active
- At least one active service-location assignment
- At least one active service-resource assignment

Services without valid booking combinations are hidden.

---

## Booking Steps

```
Service → Location → Date & Time → Customer Details → Review → Confirmation
```

Dependent-state reset rules:
- Changing service clears: location, resource, date, time
- Changing location clears: resource, date, time
- Changing date clears: time

---

## Public Availability Endpoint

`getPublicAvailabilityAction` (server action, no auth):
1. Validates input (serviceId, locationId, optional resourceId, localDate)
2. Resolves tenant + verifies booking enabled
3. Calls shared `calculateAvailability` engine
4. Sanitizes output: no occupied windows, no buffers, no reason codes
5. Groups slots by startsAt with resource options
6. Respects showResourceNames/showServicePrices settings

---

## Customer Validation

- Name: always required (1-160 chars)
- Email: required per booking rules
- Phone: required per booking rules
- Notes: optional (max 2000)
- Resolved from service's effective booking rules at creation time

---

## Final Appointment Creation

`createPublicBookingAction`:
1. Validates via publicBookingSubmissionSchema
2. Resolves tenant + verifies enabled
3. Claims idempotency key
4. Validates booking-rule required fields
5. Recalculates availability (full revalidation)
6. Matches exact slot by startsAt
7. Detects price/duration changes vs reviewed values
8. Creates via `createAppointment` (source='public_booking', status='confirmed')
9. PostgreSQL exclusion constraint handles concurrency
10. Returns public-safe confirmation

---

## Idempotency

`public_booking_requests` table:
- UNIQUE(tenant_id, idempotency_key)
- `claim_public_booking_request` RPC (INSERT ON CONFLICT DO NOTHING)
- If already completed: returns existing appointment
- If same key different payload: rejects
- Stale 'processing' records > 5 minutes: considered abandoned

---

## Rate Limiting

In-memory sliding window (`lib/rate-limit/rate-limiter.ts`):
- Availability: 60 requests / 10 minutes per IP+tenant
- Booking: 10 attempts / 10 minutes per IP+tenant
- Returns 429 when exceeded
- Swappable to Redis for production

---

## Public Error Model

```ts
type PublicBookingErrorCode =
  | 'BOOKING_UNAVAILABLE' | 'INVALID_SELECTION' | 'SLOT_TAKEN'
  | 'DETAILS_CHANGED' | 'VALIDATION_ERROR' | 'RATE_LIMITED'
  | 'CAPTCHA_FAILED' | 'BOOKING_DISABLED' | 'UNKNOWN_ERROR';
```

No internal codes, SQL errors, or diagnostic details exposed.

---

## Appointment Source

Public bookings use `source = 'public_booking'`. Database constraint extended.

---

## Confirmation Behavior

After success, displays:
- "Booking Confirmed"
- Appointment number, service, location, resource (if shown), date/time, duration, price
- Tenant confirmation message
- "Please save your appointment number"

No email/SMS claimed.

---

## CAPTCHA Boundary

Abstraction ready. No CAPTCHA currently enforced. Server-side verification point exists in the creation flow for future integration.

---

## Accessibility

- Service cards: role=button, tabIndex, onKeyDown
- Time slots: clickable chips
- Progress indicator with step labels
- Form fields with labels
- Error messages linked to context
- Mobile-first single-column layout

---

## Performance Limits

- One date per availability request
- Max 50 resources, 200 slots per resource (shared engine limits)
- Rate limiting prevents abuse
- No broad date-range searches

---

## Deferred

Not implemented: payments, deposits, temporary holds, customer accounts, notifications, recurring appointments, group bookings, external calendar sync, public cancellation/rescheduling, CAPTCHA enforcement.

---

## Manual Verification Steps

```bash
# 1. Apply migration
# supabase/migrations/20250805000016_public_booking.sql

# 2. Regenerate database types
npm run db:types

# 3. Verify
npm run lint
npm run type-check
npm run test
npm run build
```
