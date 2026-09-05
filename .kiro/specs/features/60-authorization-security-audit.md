# Authorization, Route Protection & Security Audit

Milestone 10.1 — Completed August 2026.

---

## 1. Actor Model

| Actor | Identity Source | Access Scope |
|-------|----------------|--------------|
| Anonymous | None | Public booking, token routes |
| Authenticated Customer | Supabase Auth + `customer_accounts` | Customer dashboard, linked businesses |
| Tenant Staff | Supabase Auth + `tenant_members` (role=staff) | Read-only business views |
| Tenant Manager | Supabase Auth + `tenant_members` (role=manager) | Read + review responses, package assignments |
| Tenant Admin | Supabase Auth + `tenant_members` (role=admin) | Full backoffice except ownership transfer |
| Tenant Owner | Supabase Auth + `tenant_members` (role=owner) | Full backoffice |
| Platform Admin | Supabase Auth + `platform_admins` | Platform administration |
| Internal Worker | Bearer secret (NOTIFICATION_PROCESSOR_SECRET / billing secret) | Cron processing |
| Polar Webhook | Polar signature verification | Billing event ingestion |

---

## 2. Route Inventory

### Public Routes

| Route | Type | Required Access |
|-------|------|-----------------|
| `/book/[tenantSlug]` | Public | None |
| `/book/[tenantSlug]/portal` | Public/Session | Portal session for data |
| `/book/[tenantSlug]/portal/session/[token]` | Token | Valid portal access token |
| `/book/[tenantSlug]/review/[token]` | Token | Valid review token |
| `/book/[tenantSlug]/waitlist/[token]` | Token | Valid waitlist offer token |
| `/manage-appointment/[token]` | Token | Valid appointment access token |

### Customer Account Routes

| Route | Type | Required Access |
|-------|------|-----------------|
| `/customer` | Customer | Supabase Auth + customer_accounts record |

### Business Routes

| Route | Type | Required Access |
|-------|------|-----------------|
| `/[tenantSlug]` | Business | Tenant member (any role) |
| `/[tenantSlug]/dashboard` | Business | Tenant member |
| `/[tenantSlug]/calendar` | Business | Tenant member |
| `/[tenantSlug]/appointments` | Business | Tenant member |
| `/[tenantSlug]/customers` | Business | Tenant member |
| `/[tenantSlug]/services` | Business | Tenant member |
| `/[tenantSlug]/resources` | Business | Tenant member |
| `/[tenantSlug]/locations` | Business | Tenant member |
| `/[tenantSlug]/packages` | Business | Tenant member |
| `/[tenantSlug]/reviews` | Business | Tenant member |
| `/[tenantSlug]/waitlist` | Business | Tenant member |
| `/[tenantSlug]/team` | Business | Tenant member |
| `/[tenantSlug]/settings` | Business | Tenant member (read), owner/admin (edit) |
| `/[tenantSlug]/settings/billing` | Business | Owner/Admin |
| `/[tenantSlug]/settings/booking` | Business | Tenant member (read), owner/admin (edit) |
| `/[tenantSlug]/settings/notifications` | Business | Owner/Admin |
| `/[tenantSlug]/settings/public-booking` | Business | Owner/Admin |
| `/[tenantSlug]/settings/media` | Business | Owner/Admin |
| `/[tenantSlug]/billing` | Business | Owner/Admin |

### Platform Admin Routes

| Route | Type | Required Access |
|-------|------|-----------------|
| `/platform-admin` | Platform | `platform_admins` record |
| `/platform-admin/billing` | Platform | `platform_admins` record |
| `/platform` | Platform | `platform_admins` record |

### Internal API Routes

| Route | Method | Required Access |
|-------|--------|-----------------|
| `/api/internal/notifications/process` | POST | Bearer NOTIFICATION_PROCESSOR_SECRET |
| `/api/internal/reminders/process` | POST | Bearer NOTIFICATION_PROCESSOR_SECRET |
| `/api/internal/waitlist/process` | POST | Bearer NOTIFICATION_PROCESSOR_SECRET |
| `/api/internal/billing/process-webhooks` | POST | Bearer billing processor secret |
| `/api/internal/billing/sync-products` | POST | Bearer billing sync secret |
| `/api/internal/billing/reconcile-products` | POST | Bearer billing sync secret |
| `/api/internal/billing/reconcile-subscriptions` | POST | Bearer billing sync secret |

### Webhook Routes

| Route | Method | Required Access |
|-------|--------|-----------------|
| `/api/webhooks/polar` | POST | Valid Polar webhook signature |

---

## 3. Role Matrix

| Capability | Owner | Admin | Manager | Staff |
|-----------|:-----:|:-----:|:-------:|:-----:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Calendar | ✓ | ✓ | ✓ | ✓ |
| Appointments (view) | ✓ | ✓ | ✓ | ✓ |
| Customers (view) | ✓ | ✓ | ✓ | ✓ |
| Services (view) | ✓ | ✓ | ✓ | ✓ |
| Locations (view) | ✓ | ✓ | ✓ | ✓ |
| Packages (view) | ✓ | ✓ | ✓ | ✓ |
| Reviews (view) | ✓ | ✓ | ✓ | ✓ |
| Create appointment | ✓ | ✓ | — | — |
| Cancel/reschedule appointment | ✓ | ✓ | — | — |
| Update appointment details | ✓ | ✓ | — | — |
| Update customer profile | ✓ | ✓ | — | — |
| Business settings | ✓ | ✓ | — | — |
| Billing settings | ✓ | ✓ | — | — |
| Notification settings | ✓ | ✓ | — | — |
| Public booking settings | ✓ | ✓ | — | — |
| Booking rules | ✓ | ✓ | — | — |
| Location management | ✓ | ✓ | — | — |
| Media management | ✓ | ✓ | — | — |
| Loyalty settings | ✓ | ✓ | — | — |
| Package definitions | ✓ | ✓ | — | — |
| Assign packages | ✓ | ✓ | ✓ | — |
| Respond to reviews | ✓ | ✓ | ✓ | — |
| Moderate reviews | ✓ | ✓ | — | — |
| Manage reminders | ✓ | ✓ | — | — |
| Revoke/generate tokens | ✓ | ✓ | ✓ | — |

---

## 4. Business Guard Strategy

All business routes under `(business)/[tenantSlug]` are protected by the shared layout:

```
app/(business)/[tenantSlug]/layout.tsx
  → requireTenantMember(tenantSlug)
```

This helper:
1. Calls `requireUser()` — redirects to `/login` if unauthenticated
2. Resolves tenant by slug via `getTenantBySlug()`
3. Verifies `tenant.status` is `active` or `trialing`
4. Queries `tenant_members` for `user_id + tenant_id + status=active`
5. Returns `{ user, tenant, membership }` or calls `notFound()`

Role-specific pages add `requireTenantRole(slug, ["owner", "admin"])`.

Server actions independently re-verify membership (never trust page-level auth alone).

---

## 5. Customer Account Guard Strategy

Customer routes under `(customer-account)/customer` use:

```
requireUser() + getOrCreateCustomerAccount(user.id, ...)
```

The new `requireCustomerAccount()` helper consolidates:
1. `getUser()` — Supabase auth
2. `getCustomerAccountByUserId(user.id)`
3. Verify `account.isActive`
4. Redirect to `/login?next=/customer` if any check fails

Cross-tenant access uses `requireLinkedTenantCustomer(tenantSlug)`:
- Loads account via auth
- Resolves tenant by slug
- Verifies `customer_account_tenant_links` with `link_status = 'linked'`
- Rejects `pending`, `revoked`, `conflict`

---

## 6. Cross-Tenant Protection

Every business query scopes by `tenant_id`:
```ts
.eq("tenant_id", tenantId) // derived from authenticated membership
.eq("id", objectId)        // client-supplied ID
```

Tenant ID is never accepted from client input. It is always derived from the authenticated `requireTenantMember()` context.

Object lookups (appointments, customers, services, locations, packages, reviews, waitlist entries) always include the `tenant_id` filter.

---

## 7. Server Action Audit Summary

All 40+ server actions verified:

| Pattern | Status |
|---------|--------|
| Authentication check | ✓ All actions |
| Tenant resolution from slug | ✓ All business actions |
| Membership verification | ✓ All business actions |
| Role authorization | ✓ Where restricted |
| Input validation (Yup) | ✓ Where applicable |
| Tenant-scoped queries | ✓ All data lookups |
| Object ownership verification | ✓ Target entities |

---

## 8. IDOR Audit

| Surface | Protection |
|---------|-----------|
| Business appointment by ID | `tenant_id` + `id` filter |
| Business customer by ID | `tenant_id` + `id` filter |
| Business service by ID | `tenant_id` + `id` filter |
| Business location by ID | `tenant_id` + `id` filter |
| Business resource by ID | `tenant_id` + `id` filter |
| Business package by ID | `tenant_id` + `id` filter |
| Business review by ID | `tenant_id` + `id` filter |
| Customer unified appointments | `customer_account_tenant_links` chain |
| Customer favorites | Active link verification before mutation |
| Customer notification prefs | Active link verification |

---

## 9. Admin Client Audit

| Module | Why Admin Client | Upstream Auth |
|--------|-----------------|---------------|
| `appointment-self-service.ts` | Token-based access (no user session) | Token hash verification |
| `waitlist-join-service.ts` | Public unauthenticated join | Rate limiting + tenant validation |
| `review-token-service.ts` | Token-based access | Token hash verification |
| `customer-account-queries.ts` | Cross-RLS for account creation | `requireUser()` upstream |
| `customer-package-actions.ts` | Package table access | `requireTenantMember()` + role check |
| `package-queries.ts` | Cross-table aggregation | Called from authorized pages |
| `favorite-actions.ts` | Favorites tables | `requireUser()` + link verification |
| `loyalty-actions.ts` | Loyalty tables | `requireTenantMember()` + role check |
| `request-portal-access-action.ts` | Public flow | Rate limiting, no enumeration |
| `unified-appointment-queries.ts` | Cross-tenant aggregation | Account ID from auth chain |
| `customer-notification-preferences.ts` | Preferences table | `requireUser()` + link verification |
| `portal-token-service.ts` | Session management | Token hash verification |
| `waitlist offer page` | Public token flow | Token hash verification |

All admin client uses have explicit upstream authorization or are public-facing with rate limiting and anti-enumeration patterns.

---

## 10. RLS Inventory

All business tables have RLS enabled with policies following:
- `SELECT`: tenant members (via `tenant_members` join)
- `INSERT/UPDATE/DELETE`: owner/admin (via role check in policy or SECURITY DEFINER RPC)

Sensitive tables with RLS:
- `tenant_customers` — tenant-scoped SELECT for members
- `tenant_customer_private` — tenant-scoped, owner/admin write
- `customer_accounts` — user-scoped (own record only)
- `customer_account_tenant_links` — account-scoped + tenant-scoped
- `appointments` — tenant-scoped
- `appointment_access_tokens` — service-role only (no direct client access)
- `customer_portal_access_tokens` — service-role only
- `customer_portal_sessions` — service-role only
- `appointment_review_tokens` — service-role only
- `waitlist_entries` — tenant-scoped
- `waitlist_offers` — tenant-scoped
- `notification_outbox` — service-role only
- `notification_deliveries` — service-role only
- `customer_packages` — tenant-scoped
- `customer_package_usage` — tenant-scoped
- `customer_loyalty_accounts` — tenant-scoped
- `customer_loyalty_transactions` — tenant-scoped

---

## 11. SECURITY DEFINER Audit

| Function | Purpose | Trust Model |
|----------|---------|-------------|
| `reserve_customer_package_credits` | Atomic credit reservation | Called from authorized service, tenant verified in function |
| `consume_customer_package_usage` | Reserved → consumed | Called from authorized service |
| `release_customer_package_usage` | Reserved → released | Called from authorized service |
| `create_location_exception_v2` | Atomic exception + periods | `p_tenant_id` from authenticated context |
| `update_location_exception_v2` | Atomic exception update | `p_tenant_id` from authenticated context |
| `delete_location_exception_v2` | Exception deletion | `p_tenant_id` from authenticated context |
| `set_primary_location` | Atomic primary swap | Role checked in action before call |
| `delete_business_location` | Safe location deletion | Role checked in action before call |
| `rotate_appointment_access_token` | Token rotation | Called from token service with validated context |

All SECURITY DEFINER functions use `SET search_path = public` and verify tenant consistency internally.

---

## 12. Cookie Audit

| Cookie | HTTP-Only | Secure | SameSite | Path | Expiry |
|--------|:---------:|:------:|:--------:|------|--------|
| Portal session (`cp_session_{slug}`) | ✓ | Production | Lax | `/book/{slug}/portal` | 7 days |
| Supabase auth (managed by SDK) | ✓ | ✓ | Lax | `/` | Session/Refresh |

Portal session cookies are tenant-scoped by path to prevent cross-tenant session bleed.

---

## 13. Redirect Audit

`getSafeRedirectPath()` validates all redirect targets:
- Must start with single `/`
- Rejects `//` (protocol-relative)
- Rejects protocol schemes (`http:`, `javascript:`, `data:`)
- Custom fallback support

No `returnTo`, `next`, or `callbackUrl` parameters accept external URLs.

---

## 14. Secret / Environment Audit

Server-only secrets (never `NEXT_PUBLIC_`):
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFICATION_PROCESSOR_SECRET`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_ACCESS_TOKEN`
- `APPOINTMENT_TOKEN_ENCRYPTION_KEY`
- `SMTP_PASS`

All server modules importing secrets use `import "server-only"` to prevent client bundling.

---

## 15. Logging / PII Audit

- No raw tokens logged anywhere
- No customer emails/phones in error logs
- `console.error` logs include only: error message, error code, tenant slug, object ID
- Internal API responses exclude recipient addresses
- Webhook processing logs only event ID, not payload content

---

## 16. Rate Limit Audit

| Surface | Limit | Window |
|---------|-------|--------|
| Public availability API | 60 req | 10 min |
| Public booking submission | 10 req | 10 min |
| Portal access request | 5 req | 15 min |
| Billing checkout | 8 req | 10 min |
| Billing portal session | 10 req | 10 min |
| Subscription refresh | 8 req | 10 min |

**Known limitation:** In-memory rate limiting is per-instance. In serverless/multi-instance deployments, limits are not globally enforced. Redis-backed rate limiting is a production hardening concern (not implemented — requires separate approval).

---

## 17. Test Matrix

| Test File | Tests | Coverage |
|-----------|:-----:|----------|
| `auth-helpers.test.ts` | 15 | Open redirect prevention, error types |
| `authorization-matrix.test.ts` | 27 | Actor model, route classification, role matrix, cross-tenant invariants, token security, internal API contracts, environment safety |
| `internal-route-auth.test.ts` | 13 | Bearer extraction, timing-safe comparison, edge cases |
| `appointment-token-crypto.test.ts` | 6 | Token generation, hashing, prefix extraction |
| `rate-limiter.test.ts` | 7 | Window enforcement, key isolation, blocking |

---

## 18. Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| In-memory rate limiter not distributed | Medium | Document; Redis upgrade path available |
| RLS policies not integration-tested in CI | Low | Self-service integration tests exist; full RLS suite requires test DB |
| Platform-admin UI development paused | Low | Routes remain protected by `requirePlatformAdmin()` |
| No MFA/2FA | Medium | Out of scope for this milestone; recommended for production |
| No CSRF tokens on portal mutations | Low | SameSite=Lax cookies + origin checking mitigate |

---

## 19. Confirmed Security Invariants

- ✓ Navigation hiding is not relied upon for authorization
- ✓ Authentication alone does not grant tenant access
- ✓ Tenant slug/UUID knowledge does not grant access
- ✓ Customer email equality alone does not grant unified-account access
- ✓ Client-supplied tenant/customer/account IDs are not trusted
- ✓ Platform-admin routes remain protected even though development is paused
- ✓ Public tokens are independently verified (hash, expiry, revocation, tenant)
- ✓ Internal processing endpoints are not publicly executable
- ✓ No new Polar/payment functionality was implemented
