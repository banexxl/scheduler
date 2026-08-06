# 41 - Platform Admin Billing Catalog, Polar Checkout, and Billing Customers

Milestone 7.2 introduces platform-admin billing operations and tenant checkout/customer foundations.

## 1. Scope Delivered

### Platform administration

- Billing navigation and platform-admin shell updates
- Billing dashboard metrics from local synchronized data
- Billing plan administration (create, edit, activate/deactivate, show/hide, reorder)
- Polar product diagnostics and discovery projection
- Product mapping and unmapping controls
- Manual synchronization controls (single/all)
- Webhook diagnostics page with retry action for failed events

### Tenant checkout foundation

- Tenant billing routes under settings
- Checkout-eligible plan listing
- Hosted Polar checkout-session creation
- Local checkout-session idempotent tracking (`tenant_id + request_key`)
- Checkout return/status page with non-activating semantics
- Polar customer portal session creation (owner/admin only)

### Webhook extensions

- Checkout events: `checkout.created`, `checkout.updated`, `checkout.expired`
- Customer events: `customer.created`, `customer.updated`, `customer.deleted`, `customer.state_changed`

## 2. Database

Migration:

- `supabase/migrations/20250805000021_polar_checkout_customers.sql`

Tables added:

- `tenant_billing_customers`
- `billing_checkout_sessions`

Key constraints and behavior:

- One customer mapping per tenant
- Unique Polar customer and external customer id
- Trusted external id format (`tenant:{uuid}`)
- Checkout status enum: `creating | open | updated | expired | completed | failed`
- Price/plan/product consistency checks via trigger
- Requester membership check (owner/admin) via trigger
- URL safety checks for callback URLs
- RLS: owner/admin select only, no direct client writes

## 3. Security and Isolation

- Platform routes/actions require `requirePlatformAdmin()`
- Tenant checkout/portal actions require `requireTenantRole(tenantSlug, ["owner", "admin"])`
- Internal processing routes use timing-safe bearer-secret comparison
- Checkout metadata is server-generated and trusted
- External customer id is server-generated: `tenant:{tenantId}`
- No tenant resolution by email-only customer data

## 4. Checkout and Customer Correlation

Customer tenant resolution order:

1. Existing `polar_customer_id` mapping
2. Trusted `external_id` format (`tenant:{uuid}`)
3. Verified local checkout metadata (`checkout_session_id` or `tenant_id + request_key`)
4. Otherwise unresolved

Checkout session synchronization resolution:

1. `polar_checkout_id`
2. Metadata `checkout_session_id`
3. Metadata `tenant_id + request_key`

Mismatches are rejected from update sync and captured as safe failures.

## 5. Return-Page Semantics

The return page intentionally does not activate a plan.

Displayed semantics:

- Checkout closed/completed state is acknowledged
- Billing confirmation is pending synchronization
- User can refresh local status
- User can retry with a new checkout

## 6. Routes

Platform:

- `/platform`
- `/platform/billing`
- `/platform/billing/plans`
- `/platform/billing/products`
- `/platform/billing/webhooks`

Tenant settings:

- `/{tenantSlug}/settings/billing`
- `/{tenantSlug}/settings/billing/plans`
- `/{tenantSlug}/settings/billing/return`

## 7. Environment Variables

Reused/recognized:

- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_ORGANIZATION_ID`
- `POLAR_SERVER`
- `POLAR_WEBHOOK_PROCESSOR_SECRET`
- `POLAR_RECONCILIATION_SECRET`

Backward-compatible aliases remain supported:

- `BILLING_PROCESSOR_SECRET`
- `BILLING_SYNC_SECRET`

## 8. Deferred Items

Not implemented in this milestone:

- Subscription entitlement enforcement
- Subscription lifecycle projection/activation
- Orders/payment history/refunds
- Plan limits/usage enforcement/past-due restrictions
- Appointment payments or local payment-method handling
