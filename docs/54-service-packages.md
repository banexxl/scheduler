# Service Packages & Bundles

**Milestone 8.9**

## Overview

Tenant-scoped service packages that let businesses bundle multiple service sessions into reusable credit packages assigned to customers. Credits are reserved at booking, consumed on completion, and released on cancellation.

## Package Definition Model

| Column | Description |
|--------|-------------|
| name | 2–120 chars |
| total_credits | 1–1000 |
| validity_days | 1–3650 or null (no expiry) |
| is_active | Controls new assignments |
| is_public | Prepares future customer-facing display |

## Service Eligibility

`service_package_services` maps packages to eligible services with `credits_required` per service (1–100). Default: 1 credit per appointment. Multi-credit services supported (e.g., Massage = 2 credits, Consultation = 1 credit).

## Credits-Required Semantics

Credits are service-use units, not money. A 10-credit package with a 2-credit service allows 5 uses of that service.

## Customer Package Ownership

Snapshot at assignment time:
- `credits_total` = package.total_credits (or override)
- `credits_remaining` = credits_total initially
- `expires_at` = starts_at + validity_days (or null)

Package definition changes affect future assignments only.

## Assignment Snapshot Behavior

Existing customer packages retain their original credit totals. If the catalog package changes from 10 to 15 credits, previously assigned packages still show 10.

## Expiration

- If `validity_days` is set: `expires_at = starts_at + validity_days`
- If null: no expiry
- Expired packages reject new reservations
- Existing reservations (booked before expiry) remain valid
- Display in tenant timezone

## Usage Statuses

| Status | Meaning |
|--------|---------|
| reserved | Credits held for a pending/confirmed appointment |
| consumed | Appointment completed — credit permanently used |
| released | Appointment cancelled before completion — credit restored |

## Reservation (Concurrency-Safe)

`reserve_customer_package_credits` RPC:
1. Locks customer_packages row (FOR UPDATE)
2. Validates: active, not expired, service eligible, sufficient credits
3. Decrements credits_remaining atomically
4. Inserts usage row with status=reserved
5. Marks exhausted if remaining=0

Two simultaneous requests for the last credit: exactly one succeeds (database-level row lock).

## Consumption

`consume_customer_package_usage` RPC:
- Transitions reserved → consumed
- Sets consumed_at
- No additional credit deduction (already decremented at reservation)
- Idempotent

## Release

`release_customer_package_usage` RPC:
- Only works on reserved status
- Transitions to released
- Restores credits_remaining
- Reactivates package if was exhausted
- Consumed credits are NOT auto-restored

## Concurrency Strategy

Database row-level locking via `FOR UPDATE` in the reservation RPC. Only one transaction can hold the lock at a time. This guarantees that the final credit cannot be double-spent.

## Appointment Integration

- **Create**: If package selected → reserve credits atomically
- **Complete**: Consume reserved usage
- **Cancel**: Release reserved credits
- **No-show**: Consumes credits (service capacity was used)
- **Reschedule same service**: Keep existing reservation
- **Reschedule different service**: Revalidate eligibility + credits

## Completion Behavior

When appointment transitions to completed: consume_customer_package_usage called. Idempotent — repeated completion doesn't double-consume.

## Cancellation Behavior

When appointment transitions to cancelled: release_customer_package_usage called. Restores credits to remaining balance. Only works on reserved (not consumed).

## No-Show Behavior

**Policy: no_show consumes reserved credits** because service capacity was blocked. Documented policy — configurable in future milestone.

## Reschedule Behavior

- Same service, same credits: keep existing usage row
- Different service with same credits: update usage service_id
- Different service with different credits: release old, reserve new
- Insufficient credits after change: reject service change

## Manual Adjustments

`customer_package_adjustments` table with delta, reason, adjusted_by. Cannot reduce below zero. Owner/admin only. Full audit trail.

## Ledger Model

```
Available = credits_total + sum(adjustments.delta) - reserved - consumed
         = credits_remaining (maintained atomically)
```

## CRM Integration

Customer profile shows: package name, credits remaining/total, expiration, status. Lists all packages (active, exhausted, expired, cancelled).

## Portal Integration

`getPortalCustomerPackages`: loads by email → customer_id. Shows: package name, credits remaining/total, expiry, eligible services. Never exposes internal adjustment reasons.

## Public Privacy

Package balances never revealed from public booking DTOs. Requires authenticated portal session or internal staff context. Email alone doesn't expose balance.

## Routes

- `/{tenantSlug}/packages` — package list (create, edit, toggle)
- `/{tenantSlug}/packages/new` — create form
- `/{tenantSlug}/packages/{id}/edit` — edit form

## RLS

- service_packages: members SELECT, owner/admin INSERT/UPDATE
- service_package_services: members SELECT, owner/admin INSERT/DELETE
- customer_packages: members SELECT (no direct client mutation)
- customer_package_usage: members SELECT (mutations via RPCs)
- customer_package_adjustments: members SELECT

## Deferred Payments

No payment integration in this milestone. `source` column supports future values: payment, promotion, migration. Package assignment proves manual business action, not payment.

## Files Created

```
supabase/migrations/20250805000030_service_packages.sql
features/packages/types/package.ts
features/packages/schemas/package-schemas.ts
features/packages/services/package-queries.ts
features/packages/services/package-credit-service.ts
features/packages/actions/package-actions.ts
features/packages/actions/customer-package-actions.ts
features/packages/__tests__/package-types.test.ts
features/packages/__tests__/package-schemas.test.ts
app/(business)/[tenantSlug]/packages/page.tsx
app/(business)/[tenantSlug]/packages/client-page.tsx
```

## Assumptions

- Customer identity uses tenant_customers.id
- Appointment lifecycle (completion/cancellation) triggers credit state changes
- No payment collection in this milestone
- Concurrency handled by PostgreSQL row-level locking
- Package catalog changes don't affect existing customer ownership

## Explicitly Not Implemented

- Polar/payment integration
- Gift cards / stored monetary value
- Refunds for consumed credits
- Package sharing / family accounts
- Membership subscriptions / auto-renewal
- Loyalty redemption
- Coupon stacking
- Appointment payments
- Recurring appointments
