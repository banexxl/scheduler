# Unified Customer Dashboard

**Milestone 9.2**

## Overview

Customer-facing dashboard showing appointments, businesses, rewards, and packages across all legitimately linked tenants. Authorization via active account links only (never by email alone).

## Architecture

```
requireUser() → customer_accounts → active links → tenant data → unified DTOs → client page
```

## Authorization Model

Data access requires:
1. Authenticated Supabase user (`auth.uid()`)
2. `customer_accounts` row with matching `user_id`
3. `customer_account_tenant_links` with `link_status = 'linked'`
4. Tenant customer ownership verified per appointment

**Never authorized by email alone.**

## Routes

- `/customer` — Dashboard home (upcoming, businesses, rewards summary)
- `/customer/appointments` — Unified appointment history with tabs
- `/customer/businesses` — Linked businesses
- `/customer/rewards` — Loyalty + packages per business
- `/customer/account` — Profile/security (from 9.1)

## Unified Appointments

Cross-tenant chronological view:
- Upcoming: sorted by starts_at ascending
- Past: sorted by starts_at descending
- Cancelled: sorted by starts_at descending

Each card shows: business name, service, location, resource, date/time (in business timezone), status, actions.

## Timezone Handling

Each appointment displays in its business's configured timezone. No forced conversion to browser timezone.

## Cancellation/Rescheduling

Uses same tenant booking rules and trusted services. Authorization chain:
```
auth user → account → active link → tenant customer → appointment → booking rules
```

Does not create new appointment on reschedule.

## Book Again

Past completed appointments: prefills service/location/business, links to `/book/{tenantSlug}`.

## Privacy Boundaries

- Tenants cannot see customer's other businesses
- No cross-tenant data leakage
- Internal notes, tags, adjustment reasons never exposed
- Loyalty/packages never aggregated globally

## Guest Compatibility

All existing guest flows remain functional:
- Guest public booking
- Magic-link portal
- Self-service tokens
- Review tokens
- Waitlist offer links

## Disconnect Business

Revokes link → removes from unified view. Tenant records preserved. Relinking possible later.

## Files Created

```
features/customer-account/types/unified-customer.ts
features/customer-account/services/unified-appointment-queries.ts
features/customer-account/services/unified-dashboard-queries.ts
features/customer-account/__tests__/unified-customer-types.test.ts
app/(customer-account)/customer/page.tsx
app/(customer-account)/customer/client-page.tsx
docs/57-unified-customer-dashboard.md
```

## Assumptions

- Active links are the sole authorization mechanism for cross-tenant data
- Tenant timezones used for appointment display
- Pagination at 25 per page
- Max ~100 linked tenants supported efficiently
