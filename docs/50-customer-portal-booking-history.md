# Customer Portal & Booking History

**Milestone 8.6**

## Overview

Lightweight customer portal allowing customers to view and manage their appointments via email-based magic-link access. No permanent account required.

## Access Model

```
Customer enters email
  → Rate-limited request (5/15min per IP+tenant)
  → Generic public response (no enumeration)
  → If matching appointments exist: magic-link email sent
  → Customer clicks link
  → Single-use token consumed (15-min TTL)
  → Portal session created (7-day TTL, HTTP-only cookie)
  → Customer sees their appointments
```

## Routes

| Route | Purpose |
|-------|---------|
| `/book/{slug}/portal` | Portal landing (access form or dashboard) |
| `/book/{slug}/portal/session/{token}` | Magic-link consumption |

## Migration

`supabase/migrations/20250805000027_customer_portal.sql`

### Tables

**customer_portal_access_tokens**
- Single-use magic-link tokens
- SHA-256 hash stored (raw token never persisted)
- 15-minute TTL
- Tracks: used_at, revoked_at

**customer_portal_sessions**
- Longer-lived sessions (7-day TTL)
- SHA-256 session hash stored
- Tracks: last_used_at, revoked_at

Both tables: RLS enabled, REVOKE ALL from anon/authenticated, admin-only SELECT for diagnostics.

## Token Semantics

- 32-byte high-entropy (base64url)
- SHA-256 hash for DB lookup
- Single-use (used_at set on consumption)
- 15-minute expiration
- Tenant-scoped
- Raw token never logged or stored

## Session Semantics

- 32-byte session token
- SHA-256 hash for DB lookup
- 7-day expiration
- HTTP-only, Secure, SameSite=Lax cookie
- Cookie path scoped to `/book/{slug}/portal`
- Cookie name tenant-scoped (`cp_session_{slug}`)
- last_used_at updated on each valid access
- Revocable (logout)

## Email Enumeration Protection

Both matching and non-matching emails receive identical public response:
```
If we found appointments for that email, a secure access link is on its way.
```

No timing, status, or wording variation reveals whether email exists.

## Magic-Link Email

Template type: `customer_portal_access`
- Subject: "Your appointment access link — {tenant_name}"
- Body: CTA button linking to portal session URL
- Expiry notice
- "If you didn't request this" disclaimer
- Sent via existing notification outbox + SMTP provider

## Portal Dashboard

Tabs:
- **Upcoming**: Future appointments with cancel/reschedule actions
- **History**: Past completed/no-show appointments with "Book again"
- **Cancelled**: Cancelled appointment history

Each appointment card shows: service, date/time, location, resource (when public), status, price, appointment number.

## Cancel Integration

Reuses existing booking rules:
- `allowCustomerCancellation`
- `customerCancellationNoticeMinutes`
- Appointment must be in eligible status (pending/confirmed)

## Reschedule Integration

Links to `/book/{slug}?service=...` with service preselection.
Uses existing availability engine and booking-rule validation.
Does not bypass availability.

## Book Again

For completed past appointments:
- Links to `/book/{slug}?service=...`
- Prefills service selection only (safe public key)
- Does not put email/phone/IDs in URL

## Rate Limiting

- Portal email request: 5 per 15 minutes per IP+tenant
- Uses existing in-memory sliding-window rate limiter

## Tenant Isolation

- Every DB query scoped by tenant_id
- Session cookie path scoped to tenant slug
- Cookie name includes tenant slug
- Token consumption verifies tenant context
- Cross-tenant access impossible

## Session Security

- HTTP-only cookies (no JS access)
- Secure flag in production
- SameSite=Lax
- Bounded 7-day expiration
- Revocable via logout action
- No localStorage credentials

## Public Entry Points

- Booking shell footer: "Already booked? View your appointments"
- Links to `/book/{slug}/portal`
- Secondary to main booking CTA

## Existing Self-Service Compatibility

Appointment-specific secure links (manage-appointment tokens) remain valid.
Portal is an additional access mechanism, not a replacement.

## DTO Privacy

CustomerPortalAppointment exposes only:
- appointmentNumber, status, serviceName, locationName
- resourceName (when public), dates/times, duration, price/currency
- canCancel, canReschedule flags

Never exposed: raw IDs, internal notes, buffer windows, tenant member info, billing internals.

## Mobile UX

- Card-based appointment list
- Full-width tabs
- Large action buttons
- Responsive Paper cards
- No desktop tables on mobile

## Error States

| Scenario | Display |
|----------|---------|
| Invalid/expired/used token | "This access link is invalid or has expired" + request new |
| Expired session | Shows access form (re-login) |
| No appointments | Tab-specific empty state messages |

## Files Created

```
supabase/migrations/20250805000027_customer_portal.sql
features/customer-portal/types/portal.ts
features/customer-portal/services/portal-token-service.ts
features/customer-portal/services/portal-session-cookies.ts
features/customer-portal/services/portal-email-service.ts
features/customer-portal/services/portal-appointment-queries.ts
features/customer-portal/actions/request-portal-access-action.ts
features/customer-portal/actions/logout-portal-action.ts
features/customer-portal/components/portal-access-form.tsx
features/customer-portal/components/portal-dashboard-page.tsx
features/customer-portal/__tests__/portal-token-service.test.ts
app/book/[tenantSlug]/portal/page.tsx
app/book/[tenantSlug]/portal/session/[token]/page.tsx
```

## Files Modified

```
features/public-booking/components/public-booking-shell.tsx (portal link in footer)
```

## Assumptions

- Existing notification outbox handles portal access email delivery
- Existing booking rules service provides cancel/reschedule eligibility
- Admin client bypasses RLS for all portal DB operations
- Tenant has SMTP configured for email delivery
- No customer_id is required — email-based matching is sufficient

## Explicitly Not Implemented

- Permanent customer accounts / passwords
- Social login (Google/Apple)
- Global cross-tenant customer identity
- Loyalty, reviews, gift cards
- Packages, coupons, waitlists
- Appointment payments
- Marketing campaigns
- Push notifications, SMS/WhatsApp
- External calendar sync
- Recurring appointments
