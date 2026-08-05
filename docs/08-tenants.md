# Tenants

## Multi-Tenancy Model

- Each tenant represents a business organization
- Tenants are identified by `id` (UUID) and `slug` (URL-safe string)
- Tenant status determines accessibility: only `active` tenants permit backoffice access
- A user may be a member of multiple tenants simultaneously

## Terminology

- **Workspace** — User-facing term for a tenant in the backoffice UI
- **Tenant** — Internal/database term (`tenants`, `tenant_id`, `tenantSlug`)

Database tables are NOT renamed.

## Tenant Members

Roles (from `tenant_members.role`):
- `owner` — Full control
- `admin` — Administrative access
- `manager` — Management operations
- `staff` — Basic staff access

Member status (`tenant_members.status`):
- `active` — Full access
- Other statuses are excluded from accessible workspaces

## Helpers

### `getUserTenants(user)`
- Returns all active tenant memberships for a user
- Includes tenant name, slug, status, and user's role
- Supports multiple memberships

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
- Tenant (workspace) name
- User's role badge
- User email
- Sign out button

## Routes

| Route | Purpose |
|-------|---------|
| `/app` | Workspace selector |
| `/app/new` | Create workspace (placeholder) |
| `/app/[slug]/dashboard` | Tenant dashboard |
| `/app/[slug]/locations` | Location management |
| `/app/[slug]/customers` | Customer management |
| `/app/[slug]/team` | Team management |
| `/app/[slug]/billing` | Billing & subscription |
| `/app/[slug]/settings` | Tenant settings |

## Status Behavior

- Only tenants with `status = 'active'` are accessible in the backoffice
- Suspended/inactive tenants: `requireTenantMember` returns 404
- The workspace selector only lists active tenants
