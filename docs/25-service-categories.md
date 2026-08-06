# Service Categories

## Overview

Service categories organize future bookable services into logical groups. They are tenant-scoped and purely organizational — they do not define duration, price, or booking behavior.

## Examples

- Hair (Classic haircut, Skin fade, Children's haircut)
- Beard (Beard trim, Beard styling)
- Massage (Swedish, Deep tissue)
- Consultations (Initial, Follow-up)
- Court Rentals (Tennis, Padel)

## Database: `service_categories`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `name` | text | 2–120 chars |
| `slug` | text | 2–63, unique per tenant |
| `description` | text | Nullable, max 1000 |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0, >= 0 |

Unique constraint: `(tenant_id, slug)`

## RLS Policies

| Policy | Operation | Access |
|--------|-----------|--------|
| `sc_select_member` | SELECT | All active tenant members |
| `sc_insert_owner_admin` | INSERT | Owner/admin |
| `sc_update_owner_admin` | UPDATE | Owner/admin |
| `sc_delete_owner_admin` | DELETE | Owner/admin |

## Permissions

| Role | View | Create | Edit | Reorder | Toggle | Delete |
|------|------|--------|------|---------|--------|--------|
| Owner | Yes | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | No | No | No | No | No |
| Staff | Yes | No | No | No | No | No |

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/services` | Services placeholder |
| `/${tenantSlug}/services/categories` | Category list |
| `/${tenantSlug}/services/categories/new` | Create category |
| `/${tenantSlug}/services/categories/[id]/edit` | Edit category |

## Reordering

RPC: `reorder_service_categories(target_tenant_id, ordered_category_ids)`
- SECURITY DEFINER, empty search_path
- Verifies owner/admin + tenant ownership of all IDs
- Updates sort_order atomically
- Restricted to authenticated

## Deletion

Currently allowed freely (no services reference categories yet). Future `services.category_id` will use `ON DELETE RESTRICT`, making deletion fail with a safe error when services exist.

## Inactive Categories

- Remain visible in management UI
- Can be reactivated
- Will not be selectable for new services (future)
- Do not cascade-deactivate services

## Slug Behavior

- Auto-generated from category name
- Editable (stops auto-update after manual edit)
- Unique within tenant
- Server-side uniqueness check before insert/update
- DB unique constraint is final authority

## Deferred

- Actual services (duration, price, resources, locations)
- Service-category deletion restriction
- Category media/icons
- Public booking display
- Service packages
