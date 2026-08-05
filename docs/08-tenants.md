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

Database tables are NOT renamed. Never expose "Tenant" in the UI.

## URLs

### Business Portal (Backoffice)

```
https://get-slot.app/[tenantSlug]/dashboard
https://get-slot.app/[tenantSlug]/customers
https://get-slot.app/[tenantSlug]/locations
https://get-slot.app/[tenantSlug]/team
https://get-slot.app/[tenantSlug]/billing
https://get-slot.app/[tenantSlug]/settings
```

Example: `https://get-slot.app/johns-barbershop/dashboard`

### Public Business Website (Future — subdomain)

```
https://[tenantSlug].get-slot.app
https://[tenantSlug].get-slot.app/booking
https://[tenantSlug].get-slot.app/about
https://[tenantSlug].get-slot.app/contact
```

Example: `https://johns-barbershop.get-slot.app/booking`

### Internal Rendering (`_sites`)

Public site pages are rendered internally at:

```
/_sites/[tenantSlug]/...
```

This is NOT a public URL. Users never navigate directly to `/_sites/...`.

In production, the proxy rewrites subdomain requests:
- `https://johns-barbershop.get-slot.app/booking` → internally renders `/_sites/johns-barbershop/booking`
- The browser URL remains `https://johns-barbershop.get-slot.app/booking`

## Three Logical Applications

| Application | URL Pattern | Route Group |
|-------------|-------------|-------------|
| Marketing | `https://get-slot.app` | `(marketing)` |
| Business Portal | `https://get-slot.app/[slug]/dashboard` | `(business)` |
| Public Website | `https://[slug].get-slot.app` | `_sites` (via proxy rewrite) |

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

`/[tenantSlug]/*` is protected by `requireTenantMember()`.

The shell displays:
- Business name
- User's role badge
- User email
- Sign out button

## Routes

| Route | Purpose |
|-------|---------|
| `/create-business` | Create business (placeholder) |
| `/[slug]/dashboard` | Business dashboard |
| `/[slug]/locations` | Location management |
| `/[slug]/customers` | Customer management |
| `/[slug]/team` | Team management |
| `/[slug]/billing` | Billing & subscription |
| `/[slug]/settings` | Business settings |

## Login Flow

| User Type | Destination |
|-----------|-------------|
| Platform admin | `/platform/dashboard` |
| Business owner/member | `/[tenantSlug]/dashboard` |
| Customer-only (no membership) | `/account` |
| New user (no relationships) | `/create-business` |

When multiple active tenant memberships exist, the first one ordered alphabetically by tenant name is used.

`/create-business` is a placeholder page. Actual business onboarding begins in Milestone 4.2.

## Status Behavior

- Only tenants with `status = 'active'` are accessible in the backoffice
- Suspended/inactive tenants: `requireTenantMember` returns 404
- Login destination only considers active tenants

## Reserved Slugs

Certain slugs are reserved and cannot be used as tenant slugs.
See `lib/constants/reserved-slugs.ts` for the full list.

These conflict with application routes or system paths (e.g. `admin`, `api`, `login`, `platform`, etc.).
