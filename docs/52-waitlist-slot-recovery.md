# Waitlist & Cancellation Slot Recovery

**Milestone 8.8**

## Overview

Tenant-scoped waitlist allowing customers to register interest when no appointment slots are available. When availability opens (cancellation/reschedule), matching entries are notified via secure offer links.

## Core Flow

```
No available slot → Customer joins waitlist
  → Appointment cancelled → Slot freed
  → Matching engine finds entries
  → Secure offer generated + email sent
  → Customer opens offer link
  → Books via standard public booking flow
```

Waitlist offers are NOT reservations. Slots may be taken by others first.

## Tables

### waitlist_entries
- service_id, location_id, resource_id (optional)
- customer_name/email/phone
- preferred_date_from/to (max 30 days)
- preferred_time_from/to (optional)
- allow_any_resource
- status: active/matched/booked/expired/cancelled

### waitlist_offers
- waitlist_entry_id, service/location/resource, starts_at/ends_at
- token_hash (SHA-256), token_prefix
- status: pending/notified/accepted/expired/cancelled/stale
- expires_at (configurable, default 30 min)

## Matching Engine

`findMatchingWaitlistEntries`: queries by tenant+service+location+date range, filters by resource preference and time window. Returns oldest-first (fairness). Bounded batch size (default 3).

`triggerWaitlistMatchingForSlot`: non-blocking wrapper called after cancellation. Checks waitlist_enabled, delegates to offer generation.

## Cancellation Integration

After appointment cancellation frees a slot, `triggerWaitlistMatchingForSlot` is called with the freed slot details. Non-blocking — cancellation always succeeds regardless of waitlist processing.

## Offer Generation

For each matched entry:
1. Generate 32-byte secure token (SHA-256 hash stored)
2. Insert offer with expiry
3. Mark entry as "matched"
4. Render notification email
5. Enqueue to notification outbox
6. Mark offer as "notified"

Idempotency key: `waitlist:{entryId}:{resourceId}:{startsAt}`

## Notification Template

Type: `waitlist_slot_available`
- Subject: "A time just opened up at {tenant_name}"
- Body: service, date, time, location, resource, CTA button, expiry notice
- Disclaimer: "This slot is not reserved — book promptly to secure it"

## Secure Offer Link

`/book/{slug}/waitlist/{token}` — validates token hash, checks status/expiry, shows slot details, links to booking flow. Generic error for invalid/expired/used tokens.

## Public Join

`WaitlistJoinForm` component with name/email/date range. Rate-limited (10/10min). Duplicate protection (same email+service+location+overlapping dates returns existing).

## Entry Expiration

Entries expire when `preferred_date_to < today`. Offers expire when `expires_at < now`. Processing route handles cleanup.

## Settings

On `tenant_notification_settings`:
- `waitlist_enabled` (default false)
- `waitlist_offer_expiry_minutes` (5–1440, default 30)
- `waitlist_max_date_range_days` (1–90, default 30)
- `waitlist_notify_batch_size` (1–10, default 3)

## Fairness Policy

Oldest matching active entry notified first. Batch size limits concurrent notifications (default 3). No strict queue guarantee since slots are not reserved.

## No-Reservation Semantics

Offers are invitations, not holds. The slot may be taken before the customer acts. Offer page warns: "This slot is not reserved."

## Processing Route

`POST /api/internal/waitlist/process` — protected by NOTIFICATION_PROCESSOR_SECRET. Expires old entries and offers. Can run on same cron as notification/reminder processors.

## RLS/Security

- Members can SELECT entries/offers
- No public direct DB access (REVOKE from anon)
- Tenant-consistency trigger validates service/location/resource ownership
- Offer tokens hashed (raw never stored)
- Rate limiting on public join

## Files Created

```
supabase/migrations/20250805000029_waitlist.sql
features/waitlist/types/waitlist.ts
features/waitlist/services/waitlist-join-service.ts
features/waitlist/services/waitlist-matching.ts
features/waitlist/services/waitlist-offer-service.ts
features/waitlist/services/waitlist-queries.ts
features/waitlist/services/waitlist-expiration.ts
features/waitlist/actions/join-waitlist-action.ts
features/waitlist/components/waitlist-join-form.tsx
features/waitlist/__tests__/waitlist-types.test.ts
app/book/[tenantSlug]/waitlist/[token]/page.tsx
app/(business)/[tenantSlug]/waitlist/page.tsx
app/(business)/[tenantSlug]/waitlist/client-page.tsx
app/api/internal/waitlist/process/route.ts
```

## Assumptions

- Existing notification outbox handles offer email delivery
- Cancellation action calls triggerWaitlistMatchingForSlot
- Waitlist_enabled defaults to false (safe deployment)
- No slot holds — standard first-come-first-served booking applies

## Explicitly Not Implemented

- Automatic booking
- Slot holds/reservations
- Priority bidding / paid waitlist
- Customer accounts requirement
- SMS/WhatsApp notifications
- AI slot matching
- Group capacity
- Cross-tenant waitlists
- Recurring appointments
