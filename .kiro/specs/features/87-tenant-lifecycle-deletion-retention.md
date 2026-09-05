# Tenant Lifecycle, Deletion & Retention — Milestone 13.2

## Overview

This document defines the tenant lifecycle, deletion workflow, authorization model, data retention policy, and interactions with auth users, customer accounts, and payment providers.

---

## Tenant Lifecycle

```text
trialing → active → (deletion) → DELETED
                  ↘ suspended → (deletion) → DELETED
                  ↘ cancelled → (deletion) → DELETED
```

Deletion is **immediate hard deletion** (Option A). No soft-delete/pending state.

**Rationale:** No regulatory retention requirement exists. Financial records CASCADE with the tenant. If retention becomes necessary, migrate to soft-delete + delayed purge.

---

## Authorization

| Role | Can Delete? |
|---|---|
| Owner | Yes |
| Admin | No |
| Manager | No |
| Staff | No |

Only active owners of the target tenant can initiate deletion.

---

## Deletion Workflow

1. Owner navigates to Settings → Danger Zone
2. Clicks "Delete Business"
3. Dialog shows deletion preview (counts, blockers)
4. Owner types the tenant slug as confirmation
5. Server action calls `delete_tenant_permanently` RPC
6. RPC verifies owner, checks blockers, records audit event, deletes

---

## Deletion Preconditions (Blockers)

These block deletion until resolved:

| Condition | Resolution |
|---|---|
| Active SaaS subscription | Cancel subscription first |
| Pending refunds | Wait for refund processing |

The RPC checks these and returns specific status codes.

---

## FK/CASCADE Policy

### ON DELETE CASCADE (65+ tables)

All tenant-scoped operational tables cascade from `tenants.id`:
- locations, services, resources, appointments, bookings
- tenant_members, staff_profiles, tenant_member_invitations
- payment_intents, appointment_payments, appointment_payment_refunds
- tenant_subscriptions, billing_orders, billing_refunds
- packages, loyalty, reviews, waitlist, notifications, reminders
- (See migration for complete list)

### ON DELETE RESTRICT (2 tables)

| Table | Handling |
|---|---|
| `tenant_billing_customers` | Explicitly deleted in RPC before tenant deletion |
| `billing_checkout_sessions` | Explicitly deleted in RPC before tenant deletion |

---

## Last-Owner Protection Distinction

| Scenario | Behavior |
|---|---|
| Remove last owner (normal membership mutation) | **BLOCKED** by `safe_remove_tenant_member` RPC |
| Delete entire tenant (authorized deletion) | **ALLOWED** — RPC deletes members directly |

The last-owner protection is NOT a database trigger. It's enforced only via the `safe_remove_tenant_member` RPC. The `delete_tenant_permanently` RPC bypasses this by deleting members directly before deleting the tenant.

---

## Auth User Retention

Deleting Tenant A does NOT delete the auth user because:
- No FK exists from `tenant_members.user_id` to `auth.users`
- No FK exists from `tenants.created_by` to `auth.users`
- The user may own other tenants, have a customer account, etc.

```text
User U
├── owned Tenant A (deleted)
├── member Tenant B (retained)
└── customer account (retained)
```

---

## Customer Account Behavior

- `customer_account_tenant_links` CASCADE with tenant deletion (they have `tenant_id` FK)
- `customer_favorite_tenants/services/resources` CASCADE with tenant deletion
- `customer_notification_preferences` CASCADE with tenant deletion
- Global `customer_accounts` table has NO tenant_id — unaffected

Customer's unified dashboard stops showing the deleted tenant because the link row is gone.

---

## Token Invalidation

All tokens are CASCADE-deleted with the tenant:
- `appointment_access_tokens` (self-service)
- `appointment_review_tokens` (review submission)
- `customer_portal_access_tokens` (portal sessions)
- `customer_portal_sessions`
- `waitlist_offers` (waitlist tokens)
- `tenant_member_invitations` (team invitations)

No additional code needed — data doesn't exist after deletion.

---

## Public Routes After Deletion

- `/book/{slug}` → `getTenantBySlug` returns `null` → shows "not found"
- `/{slug}/...` → `requireTenantMember` calls `notFound()` → 404
- Token-based pages → token rows don't exist → shows "invalid"

---

## Internal Workers

Workers query by tenant_id. After deletion, no rows match. Naturally safe:
- Notification processor: no outbox rows
- Reminder processor: no reminder rows
- Waitlist processor: no waitlist entries
- Payment reconciliation: no payment intents

---

## Payment Provider (Polar)

Tenant deletion does NOT:
- Cancel Polar subscriptions (must be cancelled before deletion)
- Delete Polar customer records (historical)
- Reverse Polar transactions

Local records (`tenant_billing_customers`, `billing_checkout_sessions`) are deleted to satisfy RESTRICT constraints.

---

## Audit Trail

`tenant_deletion_events` table records:
- `tenant_id`, `tenant_name`, `tenant_slug`
- `actor_user_id`
- `deleted_at`
- `summary` (JSONB with counts at deletion time)

This table has NO FK to `tenants` — survives the cascade.

---

## Dev/Test Reset

```bash
# Delete a specific test tenant
npx tsx scripts/reset-test-tenant.ts <slug>

# Delete all test-prefixed tenants
npx tsx scripts/reset-test-tenant.ts --all-test

# Also delete synthetic auth users
npx tsx scripts/reset-test-tenant.ts --all-test --delete-users
```

Uses `delete_tenant_for_test` RPC (service-role only, no auth check, no subscription blocker).

---

## Migration

`supabase/migrations/20260807000015_tenant_lifecycle_server_logs.sql`

Creates:
- `server_logs` table
- `tenant_deletion_events` table
- `delete_tenant_permanently` RPC
- `get_tenant_deletion_preview` RPC
- `delete_tenant_for_test` RPC
