# Services

## Overview

Services are the bookable offerings of a business (e.g. Classic Haircut, Deep Tissue Massage, Tennis Court Rental). Each service has a defined duration, price, and optional buffer times.

## Database: `services`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `service_category_id` | uuid | FK service_categories (SET NULL), nullable |
| `name` | text | 2–120 chars |
| `slug` | text | 2–63, unique per tenant |
| `description` | text | Nullable, max 2000 |
| `duration_minutes` | integer | 5–1440 |
| `price` | numeric(12,2) | >= 0 |
| `currency` | text | 3-letter uppercase |
| `buffer_before_minutes` | integer | 0–1440, default 0 |
| `buffer_after_minutes` | integer | 0–1440, default 0 |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0, >= 0 |

## Tenant-Category Ownership

A trigger (`verify_service_category_tenant`) ensures a service's category belongs to the same tenant as the service. This prevents cross-tenant category references even if the application has a bug.

## Duration & Buffers

- **Duration**: How long the service takes (5–1440 minutes)
- **Buffer before**: Preparation time reserved before the appointment
- **Buffer after**: Cleanup time reserved after the appointment

Total blocked time = buffer_before + duration + buffer_after

## Currency

Currency is stored per service. Uses the business default when creating, but doesn't change retroactively if the business default changes later.

## RLS Policies

| Policy | Operation | Access |
|--------|-----------|--------|
| `svc_select_member` | SELECT | All active tenant members |
| `svc_insert_owner_admin` | INSERT | Owner/admin |
| `svc_update_owner_admin` | UPDATE | Owner/admin |
| `svc_delete_owner_admin` | DELETE | Owner/admin |

## Reordering

RPC: `reorder_services(target_tenant_id, target_category_id, ordered_service_ids)`

- Operates within a category scope (null = uncategorized)
- Verifies all services belong to tenant and requested category
- Atomic sort_order update
- SECURITY DEFINER, restricted to authenticated

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/services` | Service list (replaces placeholder) |
| `/${tenantSlug}/services/new` | Create service |
| `/${tenantSlug}/services/[id]/edit` | Edit service |

## Permissions

| Role | View | Create | Edit | Toggle | Delete |
|------|------|--------|------|--------|--------|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes |
| Manager | Yes | No | No | No | No |
| Staff | Yes | No | No | No | No |

## Explicitly Not Implemented

- Service-to-resource assignments
- Service-to-location assignments
- Resource-specific pricing/duration
- Location-specific pricing
- Availability calculations
- Booking rules
- Appointments
- Packages, coupons, taxes
- Public booking pages
- Calendar UI
