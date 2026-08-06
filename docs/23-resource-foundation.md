# Resource Foundation

## Overview

A resource is any schedulable entity: a person (barber, dentist, trainer), a room, a piece of equipment, a vehicle, or any other bookable item. The resource model is generic and type-driven.

## Key Distinction: Resource vs Tenant Member

| Concept | Purpose |
|---------|---------|
| **Tenant member** | Backoffice access permission (owner, admin, manager, staff) |
| **Person resource** | Schedulable entity that customers can book |

These are separate database concepts. A person may eventually be both, but they are not the same record. Resource-to-user linking is deferred to a future milestone.

## Scheduling Hierarchy

```
Business
    ↓
Location
    ↓
Location working hours
    ↓
Location schedule exceptions
    ↓
Resource                          ← This milestone
    ↓
Resource schedule override        (future)
    ↓
Service requirements              (future)
    ↓
Bookings                          (future)
    ↓
Available slots                   (future)
```

## Database Tables

### `resource_types`

Tenant-scoped definitions of resource categories.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants |
| `name` | text | 1–120 chars |
| `slug` | text | 2–63, unique per tenant |
| `description` | text | Nullable, max 2000 |
| `resource_kind` | text | person, room, equipment, vehicle, other |
| `display_name_singular` | text | e.g. "Barber" |
| `display_name_plural` | text | e.g. "Barbers" |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0 |

### `resources`

Individual schedulable entities.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants |
| `resource_type_id` | uuid | FK resource_types |
| `name` | text | 1–120 chars |
| `slug` | text | 2–63, unique per tenant |
| `description` | text | Nullable |
| `email` | text | Nullable |
| `phone_number` | text | Nullable |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0 |

### `resource_locations`

Many-to-many assignments between resources and locations.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants |
| `resource_id` | uuid | FK resources (CASCADE) |
| `location_id` | uuid | FK locations (CASCADE) |
| `is_primary` | boolean | At most one per resource (partial unique index) |
| `is_active` | boolean | Default true |

## RPCs

| RPC | Purpose |
|-----|---------|
| `create_resource_with_locations` | Atomic resource + assignment creation |
| `set_primary_resource_location` | Atomic primary location switch |
| `delete_resource_type` | Safe deletion (rejects if in use) |
| `delete_business_resource` | Deletes resource + cascades assignments |

## RLS Policies

All three tables:
- SELECT: all active tenant members
- INSERT/UPDATE/DELETE: owner/admin only

## Permissions

| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |
| Manager | Yes | No | No | No |
| Staff | Yes | No | No | No |

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/resources` | Resource list |
| `/${tenantSlug}/resources/new` | Create resource |
| `/${tenantSlug}/resources/[id]/edit` | Edit resource |
| `/${tenantSlug}/resources/types` | Resource type list |
| `/${tenantSlug}/resources/types/new` | Create type |
| `/${tenantSlug}/resources/types/[id]/edit` | Edit type |

## Resource Type Deletion

A type can only be deleted when no resources reference it. Returns "This resource type is currently in use" otherwise.

## Resource Deletion

Deleting a resource cascades its location assignments. Future bookings will add additional guards.

## Working-Hours Inheritance (Future)

- No custom schedule → inherits location working hours
- Custom schedule → overrides location hours
- Not implemented in this milestone

## Deferred

- Resource working-hour overrides
- Resource time off
- Resource-to-user account linking
- Services and service requirements
- Appointments and bookings
- Availability calculation
- Resource images/avatars
- Calendar synchronization
