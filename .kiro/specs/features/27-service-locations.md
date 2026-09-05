# Service Location Assignments

## Overview

Service location assignments (Milestone 6.3) define which services are offered at which business locations. An assignment means the service **may** be offered at that location — it does not imply resource availability, staff schedules, or appointment bookability.

## Database: `service_locations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `service_id` | uuid | FK services (CASCADE) |
| `location_id` | uuid | FK locations (CASCADE) |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0, >= 0 |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto, trigger-maintained |

## Unique Constraint

```
UNIQUE (tenant_id, service_id, location_id)
```

A service may only be assigned once to a specific location within a tenant. The tenant-scoped constraint ensures query compatibility with tenant-filtered indexes.

## Tenant-Consistency Enforcement

A trigger (`verify_service_location_tenant`) fires on INSERT and UPDATE to validate:

- The `service_id` belongs to the same `tenant_id`
- The `location_id` belongs to the same `tenant_id`

This prevents cross-tenant assignments even when RLS is bypassed (e.g., service-role or SECURITY DEFINER operations). The trigger complements — does not replace — RLS policies.

## RLS Policies

| Policy | Operation | Access |
|--------|-----------|--------|
| `sl_select_member` | SELECT | All active tenant members |
| `sl_insert_owner_admin` | INSERT | Owner/admin |
| `sl_update_owner_admin` | UPDATE | Owner/admin |
| `sl_delete_owner_admin` | DELETE | Owner/admin |

All policies verify membership through `tenant_members`.

## RPCs

### `set_service_locations(p_tenant_id, p_service_id, p_location_ids)`

Atomically replaces the complete set of locations assigned to a service.

- Verifies caller is owner/admin
- Verifies service belongs to tenant
- Rejects duplicate location IDs
- Verifies all locations belong to tenant
- Removes assignments no longer in the set
- Inserts missing assignments (preserving existing rows)
- Supports empty array (removes all assignments)
- Returns final assignment rows
- SECURITY DEFINER, restricted to `authenticated`

### `reorder_service_locations(p_tenant_id, p_location_id, p_ordered_assignment_ids)`

Atomically reorders service assignments within a single location.

- Verifies caller is owner/admin
- Verifies location belongs to tenant
- Rejects duplicates
- Requires complete collection (all assignments for that location)
- Updates `sort_order` atomically
- Prevents mixed-location ordering
- SECURITY DEFINER, restricted to `authenticated`

## Indexes

| Index | Columns |
|-------|---------|
| `idx_service_locations_tenant` | `tenant_id` |
| `idx_service_locations_service` | `service_id` |
| `idx_service_locations_location` | `location_id` |
| `idx_service_locations_tenant_service` | `tenant_id, service_id` |
| `idx_service_locations_tenant_location` | `tenant_id, location_id` |
| `idx_service_locations_tenant_active` | `tenant_id, is_active` |
| `idx_service_locations_tenant_location_sort` | `tenant_id, location_id, sort_order` |

## Active-State Semantics

Three independent active flags determine whether an assignment is "currently usable":

```
service.is_active AND location.is_active AND service_locations.is_active
```

- `services.is_active` — controls whether the service itself is active
- `locations.is_active` — controls whether the location is active
- `service_locations.is_active` — controls whether this specific assignment is active

The `is_active` field on the junction table exists for future use cases where a business needs to temporarily disable a service at one location without removing the assignment entirely. Currently the UI does not expose toggling assignment-level active state separately — assignment existence is the primary indicator.

## Deletion Behavior

| Event | Behavior |
|-------|----------|
| Service deleted | Assignment rows CASCADE deleted |
| Location deleted | Assignment rows CASCADE deleted |
| Tenant deleted | Assignment rows CASCADE deleted (via tenant FK) |
| Assignment deleted | Neither service nor location affected |

No soft-delete or archival behavior is introduced.

## Service Form Integration

The service create and edit forms include a "Locations" section:

- Multi-select checkbox list of tenant locations
- Preselects existing assignments in edit mode
- Empty state when no locations exist
- Controls disabled while saving
- On edit: saves via `setServiceLocationsAction` (calls `set_service_locations` RPC)
- On create: uses `createServiceWithLocationsAction` which creates the service then atomically sets locations before redirecting

## Service Management List

The service list displays location assignment information:

- Location names (when <= 3 assigned)
- "X locations" (when > 3 assigned)
- "Not assigned to a location" (when 0 assigned)

This does not imply the service is publicly bookable.

## Location Edit Page

The location edit page shows an "Assigned Services" section:

- Read-only list of services assigned to this location
- Shows service name, duration, price, and active states
- Links to service edit page for changes
- The authoritative assignment editor is the service form

## Routes Affected

| Route | Change |
|-------|--------|
| `/${tenantSlug}/services` | Shows location counts per service |
| `/${tenantSlug}/services/new` | Location picker in creation form |
| `/${tenantSlug}/services/[id]/edit` | Location picker with preselection |
| `/${tenantSlug}/locations/[id]/edit` | Assigned services section |

## Permissions

| Role | View Assignments | Edit Assignments |
|------|-----------------|-----------------|
| Owner | Yes | Yes |
| Admin | Yes | Yes |
| Manager | Yes | No |
| Staff | Yes | No |

## Verification Steps

```bash
# 1. Apply migration in Supabase SQL Editor
#    File: supabase/migrations/20250805000010_service_locations.sql

# 2. Regenerate database types
npm run db:types

# 3. Verify application
npm run lint
npm run type-check
npm run build
```

## Deferred Functionality

The following are explicitly **not** implemented in this milestone:

- Service-to-resource assignments
- Employee-to-service assignments
- Location-specific pricing, duration, or buffers
- Resource availability or scheduling
- Time-slot generation or booking rules
- Public booking pages or service catalogs
- Appointment creation or management
- Drag-and-drop reordering UI (sort_order is reserved for future use)
- Assignment-level active toggle UI (field exists but not exposed)

## Assumptions

1. The `update_updated_at_column()` trigger function already exists (shared across tables).
2. The `tenants`, `services`, and `locations` tables exist with `id` and `tenant_id` columns.
3. Location assignments are managed exclusively from the service form (single authoritative editor).
4. The `sort_order` column is reserved for future location-specific service ordering but not actively managed via UI in this milestone.
5. Assignment `is_active` defaults to true and is not toggled separately in current UI — existence implies the service is offered at the location.
