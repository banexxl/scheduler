# Service Resource Assignments

## Overview

Service resource assignments (Milestone 6.4) define which resources are qualified to perform which services. An assignment means the resource **is permitted or qualified** to perform the service — it does not imply the resource is available, working, or located where the service is offered.

## Database: `service_resources`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `service_id` | uuid | FK services (CASCADE) |
| `resource_id` | uuid | FK resources (CASCADE) |
| `is_active` | boolean | Default true |
| `duration_override_minutes` | integer | Nullable, 5–1440 |
| `price_override` | numeric(12,2) | Nullable, >= 0 |
| `currency_override` | text | Nullable, 3 uppercase letters |
| `buffer_before_override_minutes` | integer | Nullable, 0–1440 |
| `buffer_after_override_minutes` | integer | Nullable, 0–1440 |
| `sort_order` | integer | Default 0, >= 0 |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto, trigger-maintained |

## Unique Constraint

```
UNIQUE (tenant_id, service_id, resource_id)
```

## Tenant-Consistency Enforcement

A trigger (`verify_service_resource_tenant`) fires on INSERT and UPDATE to validate:

- The `service_id` belongs to the same `tenant_id`
- The `resource_id` belongs to the same `tenant_id`

This prevents cross-tenant assignments even when RLS is bypassed.

## Override Semantics

Overrides allow a resource to have different values than the base service:

| Override | Null means | Zero means |
|----------|-----------|------------|
| `duration_override_minutes` | Use service duration | N/A (min 5) |
| `price_override` | Use service price | Free (explicit $0) |
| `currency_override` | Use service currency | N/A (3-letter code) |
| `buffer_before_override_minutes` | Use service buffer | Explicitly no buffer |
| `buffer_after_override_minutes` | Use service buffer | Explicitly no buffer |

### Resolution Logic

```
effective_duration = assignment.duration_override_minutes ?? service.duration_minutes
effective_price = assignment.price_override ?? service.price
effective_currency = assignment.currency_override ?? service.currency
effective_buffer_before = assignment.buffer_before_override_minutes ?? service.buffer_before_minutes
effective_buffer_after = assignment.buffer_after_override_minutes ?? service.buffer_after_minutes
```

Uses nullish coalescing (`??`) — NOT truthy fallback (`||`) — to preserve valid zero values.

### Currency Override Rule

Currency override requires a price override. Setting a currency without a price is rejected because it is ambiguous. This is enforced at:

- Database constraint (`sr_currency_requires_price`)
- Validation schema (Yup test)
- RPC validation

No currency conversion is performed.

## RLS Policies

| Policy | Operation | Access |
|--------|-----------|--------|
| `sr_select_member` | SELECT | All active tenant members |
| `sr_insert_owner_admin` | INSERT | Owner/admin |
| `sr_update_owner_admin` | UPDATE | Owner/admin |
| `sr_delete_owner_admin` | DELETE | Owner/admin |

## RPCs

### `set_service_resources(p_tenant_id, p_service_id, p_assignments jsonb)`

Atomically replaces the complete set of resource assignments for a service.

- Accepts JSONB array of assignment objects
- Verifies caller is owner/admin
- Verifies service belongs to tenant
- Rejects duplicate resource IDs
- Verifies all resources belong to tenant
- Validates all override fields
- Removes assignments omitted from the set
- Upserts existing and new assignments (preserves IDs)
- Supports empty array (removes all)
- Returns final assignment rows
- SECURITY DEFINER, restricted to `authenticated`

### `reorder_service_resources(p_tenant_id, p_service_id, p_ordered_assignment_ids)`

Atomically reorders resource assignments within a service.

- Verifies ownership and completeness
- SECURITY DEFINER, restricted to `authenticated`

### `create_service_with_assignments(p_tenant_id, ...service_fields, p_location_ids, p_resource_assignments)`

Atomically creates a service with both location and resource assignments in one transaction.

- Validates all inputs (category, locations, resources, overrides)
- Rolls back everything if any part fails
- Returns the new service ID
- Replaces the previous `createServiceWithLocationsAction` multi-step approach
- SECURITY DEFINER, restricted to `authenticated`

## Indexes

| Index | Columns |
|-------|---------|
| `idx_service_resources_tenant` | `tenant_id` |
| `idx_service_resources_service` | `service_id` |
| `idx_service_resources_resource` | `resource_id` |
| `idx_service_resources_tenant_service` | `tenant_id, service_id` |
| `idx_service_resources_tenant_resource` | `tenant_id, resource_id` |
| `idx_service_resources_tenant_active` | `tenant_id, is_active` |
| `idx_service_resources_tenant_service_sort` | `tenant_id, service_id, sort_order` |
| `idx_service_resources_tenant_resource_sort` | `tenant_id, resource_id, sort_order` |

## Active-State Semantics

Three independent flags determine eligibility:

```
service.is_active AND resource.is_active AND service_resources.is_active
```

The assignment-level `is_active` exists but is not separately toggled in the current UI — assignment existence implies the resource can perform the service. The field is reserved for future use (e.g., temporarily disabling a resource for a service without removing the assignment).

## Location Compatibility

A service-resource assignment does NOT imply location compatibility:

```
Service A is offered at Location 1.
Resource B can perform Service A.
This DOES NOT prove Resource B works at Location 1.
```

A future scheduling layer may calculate valid combinations by intersecting service locations, service resources, resource locations, and resource schedules.

## Deletion Behavior

| Event | Behavior |
|-------|----------|
| Service deleted | Assignment rows CASCADE deleted |
| Resource deleted | Assignment rows CASCADE deleted |
| Tenant deleted | Assignment rows CASCADE deleted |
| Assignment deleted | Neither service nor resource affected |

## Service Form Integration

The service create and edit forms include a "Resources" section:

- Multi-select checkbox list of tenant resources
- Each selected resource has collapsible "Advanced overrides" fields
- Override fields: Duration, Price, Currency, Buffer before, Buffer after
- Leave blank = use service default
- Explicit zero is preserved (not treated as "no override")
- Preselects existing assignments with overrides in edit mode
- On edit: saves via `setServiceResourcesAction` (calls `set_service_resources` RPC)
- On create: uses `createServiceWithAssignmentsAction` (calls `create_service_with_assignments` RPC)

## Service Management List

Shows resource assignment information per service:

- Resource names (when <= 3 assigned)
- "X resources" (when > 3 assigned)
- "No resources assigned" (when 0)

Does not display availability-derived information.

## Resource Edit Page

Shows an "Assigned Services" section:

- Read-only list of services assigned to this resource
- Shows effective duration and price (resolved with overrides)
- "Overrides" chip when resource has custom values
- Active state indicators
- Links to service edit page

## Routes Affected

| Route | Change |
|-------|--------|
| `/${tenantSlug}/services` | Shows resource counts per service |
| `/${tenantSlug}/services/new` | Resource picker in creation form |
| `/${tenantSlug}/services/[id]/edit` | Resource picker with preselection + overrides |
| `/${tenantSlug}/resources/[id]/edit` | Assigned services section |

## Combined Service Creation

The `create_service_with_assignments` RPC creates in one transaction:

1. Service record
2. Location assignments
3. Resource assignments (with overrides)

If any step fails, the entire transaction is rolled back — no partially configured service is left behind.

## Permissions

| Role | View Assignments | Edit Assignments |
|------|-----------------|-----------------|
| Owner | Yes | Yes |
| Admin | Yes | Yes |
| Manager | Yes | No |
| Staff | Yes | No |

## Verification Steps

```bash
# 1. Apply the migration in Supabase SQL Editor
#    File: supabase/migrations/20250805000011_service_resources.sql

# 2. Regenerate database types
npm run db:types

# 3. Verify the application
npm run lint
npm run type-check
npm run build
```

## Deferred Functionality

The following are explicitly **not** implemented:

- Resource working hours or schedules
- Availability calculations
- Time-slot generation
- Booking rules or appointments
- Location-resource-service compatibility triples
- Drag-and-drop reordering UI (sort_order is managed by RPC, no UI exposed)
- Public booking pages
- Calendar UI
- Payments, notifications, packages

## Assumptions

1. The `update_updated_at_column()` trigger function already exists.
2. The `tenants`, `services`, `resources`, `service_locations` tables exist.
3. Resource assignments are managed exclusively from the service form.
4. `sort_order` is reserved for future ordering UI but managed automatically via RPC.
5. Assignment `is_active` defaults to true and is set via the RPC payload.
6. Override fields use null to mean "no override" and explicit zero where valid.
7. Currency override without price override is rejected (ambiguous).
