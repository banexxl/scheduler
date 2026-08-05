# Platform Administration

## Access Control

Platform admin access is determined solely by the `platform_admins` table:
- Requires `user_id` match
- Requires `is_active = true`
- Roles: `super_admin`, `admin`, `support`, `billing`

A normal tenant owner does NOT get platform access unless they also have an active `platform_admins` row.

## Helpers

### `getPlatformAdmin(user)`
- Returns the active platform_admins row or null
- Uses RLS (no admin client)
- Does not match by email or metadata

### `requirePlatformAdmin()`
- Calls `requireUser()` first
- Loads platform admin relationship
- Returns 404 when unauthorized
- Returns `{ user, platformAdmin }` on success

## Protected Layout

`/platform/*` is protected by `requirePlatformAdmin()` in the layout.

The shell displays:
- "Platform Administration" heading
- Admin role badge
- User email
- Sign out button

## Routes

| Route | Purpose |
|-------|---------|
| `/platform` | Platform home |
| `/platform/dashboard` | Admin dashboard |
| `/platform/tenants` | Tenant management |
| `/platform/tenants/[id]` | Tenant detail |
| `/platform/subscriptions` | Subscription management |
| `/platform/users` | User management |
| `/platform/audit-logs` | Audit trail |
