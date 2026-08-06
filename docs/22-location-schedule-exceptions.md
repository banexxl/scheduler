# Location Schedule Exceptions

## Overview

Schedule exceptions are date-specific overrides for a location's regular weekly working hours. They cover holidays, special opening hours, closures, and other one-off schedule changes.

## Scheduling Evaluation Order

```
Location weekly working hours
    ↓
Location date-specific exception     ← This milestone
    ↓
Resource schedule override           (future)
    ↓
Service duration and buffers         (future)
    ↓
Existing bookings                    (future)
    ↓
Available slots                      (future)
```

For a specific date, an exception completely overrides the normal weekday schedule.

## Database

### Table: `location_schedule_exceptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → tenants (CASCADE) |
| `location_id` | uuid | FK → locations (CASCADE) |
| `exception_date` | date | The specific date |
| `name` | text | 1–120 chars, trimmed |
| `is_closed` | boolean | Default true |
| `opens_at` | time | NULL when closed |
| `closes_at` | time | NULL when closed, must be > opens_at |
| `notes` | text | Optional, max 1000 chars |
| `created_by` | uuid | FK → auth.users |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto (trigger) |

Unique constraint: `(location_id, exception_date)` — one exception per date per location.

### Constraints

- Name must be non-empty and ≤ 120 chars
- Notes ≤ 1000 chars
- Closed: opens_at and closes_at must be NULL
- Open: both times required, opens_at < closes_at (no overnight)

## RPCs

| RPC | Purpose |
|-----|---------|
| `create_location_schedule_exception` | Creates with auth + role + ownership verification |
| `update_location_schedule_exception` | Updates with same verification |
| `delete_location_schedule_exception` | Deletes with same verification |

All are SECURITY DEFINER, empty search_path, restricted to `authenticated`.

## RLS Policies

| Policy | Operation | Access |
|--------|-----------|--------|
| `lse_select_member` | SELECT | All active tenant members |
| `lse_insert_owner_admin` | INSERT | Owner/admin |
| `lse_update_owner_admin` | UPDATE | Owner/admin |
| `lse_delete_owner_admin` | DELETE | Owner/admin |

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
| `/${tenantSlug}/locations/[locationId]/exceptions` | Exception list |
| `/${tenantSlug}/locations/[locationId]/exceptions/new` | Create exception |
| `/${tenantSlug}/locations/[locationId]/exceptions/[exceptionId]/edit` | Edit exception |

## Past-Date Rules

- Cannot create exception for a past date
- Cannot edit an exception whose date is in the past
- Can delete past exceptions (owner/admin)
- Past exceptions displayed with "Past" badge and reduced opacity

## Date Handling

- Dates stored as `date` type (YYYY-MM-DD)
- No timezone conversion applied to the date itself
- Past-date comparison uses server date (UTC-based)

## One Exception Per Date

Only one exception per location per date. Duplicate-date attempts return:
> "This location already has a schedule exception for that date."

## UI

- Exception list grouped by Upcoming / Past
- Cards with name, date, status chip (Closed/Special hours/Past)
- Name suggestions (Public holiday, Maintenance, etc.)
- Effective schedule preview on the form
- Delete confirmation dialog
- Read-only mode for manager/staff

## Audit Logging

Deferred. RPCs use `auth.uid()` for `created_by` but do not write to `audit_logs`. A trigger or separate RPC may be added in a future milestone.

## Deferred

- Recurring holidays
- Country holiday imports
- Multiple intervals per date
- Overnight schedules
- Resource-level exceptions
- Seasonal schedules
- Calendar sync
- Availability calculation
