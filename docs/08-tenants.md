# Tenants (Businesses)

## Business Model

### One Tenant = One Business

A tenant represents exactly one business (e.g. "John's Barbershop", "Bella Beauty Studio").

### One Business = Multiple Locations

A tenant may own multiple physical locations. Locations are NOT separate tenants.

Example:
- John's Barbershop
  - Belgrade
  - Novi Sad
  - Niš

### One Owner = One Tenant

A business owner creates one tenant. That tenant becomes their business.
Multi-business management from a single account is not supported in the normal flow.

### Customers May Belong to Many Businesses

Customer accounts are global. One customer can book with many businesses.

## Terminology

- **Business** — User-facing term in the UI
- **Tenant** — Internal/database term (`tenants`, `tenant_id`, `tenantSlug`)

Database tables are NOT renamed.

## URLs

### Tenant Dashboard (Backoffice)

```
https://get-slot.app/[tenantSlug]/dashboard
```

Example: `https://get-slot.app/johns-barbershop/dashboard`

### Tenant Public Website (Future)

```
https://[tenantSlug].get-slot.app
```

Example: `https://johns-barbershop.get-slot.app`

## Tenant Members

Roles (from `tenant_members.role`):
- `owner` — Full control
- `admin` — Administrative access
- `manager` — Management operations
- `staff` — Basic staff access

Member status (`tenant_members.status`):
- `active` — Full access
- Other statuses are excluded from accessible businesses

## Helpers

### `getUserTenants(user)`
- Returns all active tenant memberships for a user
- Includes tenant name, slug, status, and user's role

### `getTenantBySlug(slug)`
- Loads a tenant by normalized slug
- Does NOT grant access (membership still required)

### `requireTenantMember(tenantSlug)`
1. Calls `requireUser()`
2. Normalizes the slug
3. Loads the tenant (must be active)
4. Verifies active membership
5. Returns `{ user, tenant, membership }`
6. Returns 404 on failure (hides tenant existence)

### `requireTenantRole(tenantSlug, allowedRoles)`
- Extends `requireTenantMember` with role checking
- Returns 404 if user's role not in allowed list

## Protected Layout

`/app/[tenantSlug]/*` is protected by `requireTenantMember()`.

The shell displays:
- Business name
- User's role badge
- User email
- Sign out button

## Routes

| Route | Purpose |
|-------|---------|
| `/app` | Authenticated landing (redirects to business or /account) |
| `/app/new` | Create business (placeholder) |
| `/app/[slug]/dashboard` | Business dashboard |
| `/app/[slug]/locations` | Location management |
| `/app/[slug]/customers` | Customer management |
| `/app/[slug]/team` | Team management |
| `/app/[slug]/billing` | Billing & subscription |
| `/app/[slug]/settings` | Business settings |

## Status Behavior

- Only tenants with `status = 'active'` are accessible in the backoffice
- Suspended/inactive tenants: `requireTenantMember` returns 404
- Login destination only considers active tenants

## Reserved Slugs

Certain slugs are reserved and cannot be used as tenant slugs.
See `lib/constants/reserved-slugs.ts` for the full list.

These conflict with application routes or system paths (e.g. `admin`, `api`, `login`, `platform`, etc.).
