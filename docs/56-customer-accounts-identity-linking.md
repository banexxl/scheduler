# Customer Accounts & Identity Linking

**Milestone 9.1**

## Overview

Global customer accounts with tenant-customer linking. Customers can register, link to businesses they've visited, and manage their profile — without breaking existing guest/portal flows.

## Identity Model

```
customer_accounts (global, one per auth user)
        ↓ links to
customer_account_tenant_links
        ↓ references
tenant_customers (tenant-scoped CRM records)
```

Global account ≠ tenant customer. They're linked, not merged.

## Auth

Uses existing Supabase Auth (email/password). `user_id` is the durable identity key. Email is profile/contact data.

## Account Table

- `user_id` (UNIQUE, FK to auth.users implied)
- `email`, `full_name`, `phone`, `avatar_url`
- `is_active`, `email_verified_at`
- RLS: customer reads/updates only own row

## Tenant Link Table

- `customer_account_id` → `customer_accounts`
- `tenant_id` + `tenant_customer_id` → tenant CRM record
- `link_status`: pending/linked/revoked/conflict
- `link_method`: account_registration/verified_email/portal_session/appointment_claim/manual_support
- UNIQUE (tenant_id, tenant_customer_id) — one active link per tenant customer
- Trigger prevents same tenant customer linking to multiple accounts

## Verified-Email Linking

Auto-link criteria:
1. Auth email verified
2. Exact normalized email match
3. Exactly one tenant customer with that email (no duplicates)
4. Tenant customer not already linked to another account

If multiple tenant customers match → conflict (not auto-linked).

## Guest Compatibility

Guest booking, waitlist, reviews, self-service, and portal all remain functional without an account. Account is optional.

## Lazy Account Creation

If auth user visits customer area without `customer_accounts` row → created on demand.

## Linked Businesses

`getLinkedBusinesses()`: returns tenant name, slug, linked_at for all active links.

## Privacy Boundaries

- Tenants cannot see which other businesses customer uses
- Global account doesn't expose cross-tenant data
- Tenant CRM records remain business-owned
- Profile changes don't auto-overwrite tenant CRM data

## Account Deletion

Severing global account:
- Revokes all links
- Preserves tenant appointments/CRM records
- Does not delete business operational history

## Security

- `user_id` resolved server-side from `auth.uid()`
- Never trust client-supplied account/customer IDs
- Email linking requires verified auth email
- Rate limiting on registration/linking

## Files Created

```
supabase/migrations/20250805000032_customer_accounts.sql
features/customer-account/types/customer-account.ts
features/customer-account/services/customer-account-queries.ts
features/customer-account/services/customer-account-link-service.ts
features/customer-account/__tests__/customer-account-types.test.ts
docs/56-customer-accounts-identity-linking.md
```

## Assumptions

- Supabase Auth handles registration/login/sessions
- Tenant customers table exists with email field
- No payment integration in this milestone
- Cross-tenant unified views deferred to 9.2
