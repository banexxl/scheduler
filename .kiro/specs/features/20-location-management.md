# Location Management

## Overview

Location management (`/${tenantSlug}/locations`) allows business owners and admins to create, edit, activate/deactivate, and delete locations. Each business has at least one location (created during onboarding).

## Permissions

| Role | View | Create | Edit | Set Primary | Toggle Status | Delete |
|------|------|--------|------|-------------|---------------|--------|
| Owner | Yes | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | No | No | No | No | No |
| Staff | Yes | No | No | No | No | No |

Enforced both in the UI (disabled controls) and Server Actions (role check before database operations).

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/locations` | Location list |
| `/${tenantSlug}/locations/new` | Create location form |
| `/${tenantSlug}/locations/[locationId]/edit` | Edit location form |

## Location Fields

| Field | Required | Validation |
|-------|----------|------------|
| Name | Yes | Trim, 2–120 chars |
| Slug | Yes | 2–63 chars, lowercase, letters/digits/hyphens, unique within tenant |
| Location Type | Yes | physical, online, customer_address |
| Description | No | Max 2000 chars |
| Street Address | No | Max 255 chars |
| City | No | Max 120 chars |
| Province/State | No | Max 120 chars |
| Country | No | Max 120 chars |
| Postal Code | No | Max 20 chars |
| Phone | No | Max 40 chars |
| Email | No | Valid email, max 254 chars |
| Timezone | Yes | IANA format |
| Active | Yes | Boolean, default true |

## Slug Behavior

- Auto-generated from name
- Stops auto-updating after manual edit
- Unique within the tenant (not globally)
- Checked server-side before insert/update
- Database unique index is final authority

## Location Types

| Value | Label |
|-------|-------|
| `physical` | Physical location |
| `online` | Online |
| `customer_address` | Customer's address |

## Primary Location

### Rules

- Exactly one primary location per business at all times
- Primary location cannot be deleted
- Primary location cannot be deactivated
- Setting a new primary atomically unsets the previous one and ensures the new one is active

### RPC: `set_primary_location`

```sql
set_primary_location(target_tenant_id uuid, target_location_id uuid) → boolean
```

- SECURITY DEFINER with empty search_path
- Verifies owner/admin role
- Verifies location belongs to tenant
- Unsets all primary flags, sets target as primary + active
- Single transaction
- Restricted to `authenticated` role

## Deletion

### Rules

- Cannot delete primary location
- Cannot delete last location
- Cannot delete if foreign-key dependencies exist (handled safely)
- Requires owner/admin role
- Confirmation dialog required in UI

### RPC: `delete_business_location`

```sql
delete_business_location(target_tenant_id uuid, target_location_id uuid) → boolean
```

- SECURITY DEFINER with empty search_path
- Verifies owner/admin role
- Verifies location belongs to tenant
- Rejects primary location deletion
- Rejects last-location deletion
- Restricted to `authenticated` role

## Activate/Deactivate

- Owner/admin can toggle non-primary locations
- Primary location cannot be deactivated
- Inactive locations remain visible in portal
- Inactive locations will be excluded from public booking (future)

## RLS Policies

Migration: `20250805000003_locations_rls_and_rpcs.sql`

| Policy | Operation | Access |
|--------|-----------|--------|
| `locations_select_member` | SELECT | All active tenant members |
| `locations_insert_owner_admin` | INSERT | Owner/admin only |
| `locations_update_owner_admin` | UPDATE | Owner/admin only |
| `locations_delete_owner_admin` | DELETE | Owner/admin only |

Managers and staff cannot insert, update, or delete locations through RLS.

## Server Actions

| Action | File | Purpose |
|--------|------|---------|
| `createLocationAction` | `features/locations/actions/create-location.ts` | Create with slug uniqueness check |
| `updateLocationAction` | `features/locations/actions/update-location.ts` | Update with slug uniqueness check (excluding self) |
| `setPrimaryLocationAction` | `features/locations/actions/set-primary-location.ts` | Atomic primary switch via RPC |
| `toggleLocationStatusAction` | `features/locations/actions/toggle-location-status.ts` | Activate/deactivate |
| `deleteLocationAction` | `features/locations/actions/delete-location.ts` | Safe deletion via RPC |

All actions: require auth, verify role, use explicit payloads, never use admin client.

## File Structure

```
features/locations/
├── actions/
│   ├── create-location.ts
│   ├── update-location.ts
│   ├── set-primary-location.ts
│   ├── toggle-location-status.ts
│   └── delete-location.ts
├── components/
│   ├── location-form.tsx
│   └── location-list.tsx
├── schemas/
│   └── location-schema.ts
├── services/
│   ├── get-business-locations.ts
│   └── get-location.ts
└── utils/
    └── location-slug.ts
```

## Dashboard Integration

After any location mutation, `revalidatePath` is called for:
- `/${tenantSlug}/locations`
- `/${tenantSlug}/dashboard`

Dashboard counts and primary location reflect changes on next visit.

## Deferred

- Working hours / business hours per location
- Holidays and closures
- Map display / geocoding
- Resources assigned to locations
- Services per location
- Media/photo uploads
