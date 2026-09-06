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

## Addendum — Portal Home Cards, Navigation & Account Linking

> Extends the original Milestone 8.6 portal. The dark-theme redesign and public
> booking integration are documented in `109-customer-booking-experience-2.md`
> (section 2.1).

### Portal home cards (`/book/{slug}/portal`, authenticated)

When a customer is authenticated, the dashboard renders two cards above the
appointment tabs:

- **Tenant Details** — `features/customer-portal/components/tenant-details-card.tsx`.
  Business details read from `TenantThemeProvider` context: logo, name, tagline,
  description, address, phone, email, website, social links. No extra fetch.
- **Customer Account** — `features/customer-portal/components/customer-account-card.tsx`.
  The logged-in customer's global `customer_accounts` row: avatar, name, verified
  chip (`email_verified_at`), member-since (`created_at`), email, phone, preferred
  language. Loaded in `app/book/[tenantSlug]/portal/page.tsx` via the admin client
  scoped to `user_id = auth.uid()`; DTO excludes `id`, `user_id`, `is_active`.

### Route-based header navigation

`features/customer-portal/hooks/usePortalNavigation.ts` selects the nav set by the
**current route** (not auth state):

- Outside `/portal`: logo + "Home" → `/book/{slug}`; storefront section anchors.
- On `/portal*`: logo + "Home" → `/book/{slug}/portal`; Appointments, Rewards,
  Account.

### Account ↔ tenant linking on login

`customer-login-action.ts` calls the shared
`features/customer-portal/services/auto-link-customer.ts`, which creates the
`tenant_customers` row and `customer_account_tenant_links` bridge when missing.
This guarantees a freshly registered customer is linked to the tenant on first
login regardless of email-confirmation timing (previously the login helper only
linked pre-existing `tenant_customers` rows).

### Dark theme

Portal dashboard and subpages (`appointments`, `account`, `rewards`) use the shared
`features/customer-portal/components/PortalPageShell.tsx` dark-glass wrapper.

### Additional Files

```
features/customer-portal/components/tenant-details-card.tsx
features/customer-portal/components/customer-account-card.tsx
features/customer-portal/components/PortalPageShell.tsx
```
