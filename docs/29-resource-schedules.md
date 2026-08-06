# Resource Working Hours and Time Off

## Overview

Resource schedules (Milestone 6.5) define when resources normally work and when they are unavailable. Working hours are recurring weekly periods. Time off represents date-specific exceptions.

Neither one creates bookable time slots by itself. A future availability engine will combine working hours, time off, service assignments, location assignments, and booking rules.

## Weekly Schedule Model

Resources have recurring working periods defined per day of week. Multiple periods per day are supported (split shifts). Each period may optionally be scoped to a specific location.

Example:
```
Monday
  09:00–13:00  Location A
  14:00–18:00  Location A
Tuesday
  10:00–16:00  Location B
```

## Day-of-Week Convention

ISO-style numeric:

| Value | Day |
|-------|-----|
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday |

Constraint enforced at database level: `day_of_week BETWEEN 1 AND 7`.

## Time-Zone Semantics

- Weekly schedule times are stored as PostgreSQL `time` (wall-clock time).
- Interpreted in the tenant's configured time zone, not UTC.
- Time-off ranges stored as `timestamptz` (exact instants).
- Full-day time off converted from tenant-local date boundaries to timestamps.
- No hardcoded server/browser/deployment time zones.
- No manual DST calculations in client code.

## Database: `resource_working_hours`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `resource_id` | uuid | FK resources (CASCADE) |
| `location_id` | uuid | FK locations (CASCADE), nullable |
| `day_of_week` | smallint | 1–7 (ISO) |
| `start_time` | time | Wall-clock in tenant TZ |
| `end_time` | time | Wall-clock in tenant TZ |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0, >= 0 |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto, trigger-maintained |

### Working-Hour Constraints

- `start_time < end_time` — no overnight periods
- `day_of_week BETWEEN 1 AND 7`
- `sort_order >= 0`
- Tenant consistency trigger validates resource and location ownership
- Overlap trigger prevents overlapping active periods for same resource + day + location scope

### Overlap Rules

- Two active rows for the same resource, day, and location scope must not overlap
- Adjacent periods are valid (`09:00–12:00` + `12:00–16:00`)
- Inactive rows may exist without overlap checking
- Concurrency-safe via database trigger (not just client-side)
- `location_id = NULL` and `location_id = X` are separate scopes

### Split Shifts

Supported via multiple periods per day:
```
Monday 09:00–13:00
Monday 14:00–18:00
```

### Overnight Periods

Not supported. Rejected by `start_time < end_time` constraint. Overnight shifts must be split into separate day entries if needed (deferred).

## Database: `resource_time_off`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `resource_id` | uuid | FK resources (CASCADE) |
| `location_id` | uuid | FK locations (CASCADE), nullable |
| `title` | text | Nullable, 1–120 chars |
| `notes` | text | Nullable, max 2000 chars |
| `starts_at` | timestamptz | Start (inclusive) |
| `ends_at` | timestamptz | End (exclusive) |
| `is_all_day` | boolean | Default false |
| `is_active` | boolean | Default true |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto, trigger-maintained |

### Time-Off Semantics

Half-open interval: `[starts_at, ends_at)` — start inclusive, end exclusive.

Full-day time off:
- One day: `2026-08-12T00:00:00` to `2026-08-13T00:00:00`
- Multi-day (Aug 20–24): `2026-08-20T00:00:00` to `2026-08-25T00:00:00`
- UI end date is inclusive; storage end is exclusive (next midnight)

### Time-Off Overlap Rules

- Global time off (`location_id = NULL`) blocks all locations
- Location-specific time off blocks only that location
- A global active row must not overlap any other active row for the same resource
- Location-specific rows for different locations may coexist in the same time range
- Enforced by database trigger under concurrent writes

## Tenant Consistency

Both tables have triggers that validate on INSERT and UPDATE:
- Resource belongs to `tenant_id`
- Location (when present) belongs to `tenant_id`

Active even when RLS is bypassed.

## RLS Policies

Both tables use identical policy patterns:

| Policy | Operation | Access |
|--------|-----------|--------|
| `*_select_member` | SELECT | All active tenant members |
| `*_insert_owner_admin` | INSERT | Owner/admin |
| `*_update_owner_admin` | UPDATE | Owner/admin |
| `*_delete_owner_admin` | DELETE | Owner/admin |

## RPCs

### `set_resource_working_hours(p_tenant_id, p_resource_id, p_periods jsonb)`

Atomically replaces the entire weekly schedule for a resource.

- Validates all periods (days, times, locations, overlaps within set)
- Deletes existing schedule, inserts new periods
- Overlap trigger validates each inserted row
- Supports empty array to clear schedule
- SECURITY DEFINER, restricted to `authenticated`

### `create_resource_time_off(p_tenant_id, p_resource_id, ...)`

Creates a time-off entry. Validates ownership. Overlap trigger active.

### `update_resource_time_off(p_tenant_id, p_time_off_id, ...)`

Updates a time-off entry. Overlap trigger re-validates on changes.

### `delete_resource_time_off(p_tenant_id, p_time_off_id)`

Deletes a time-off entry. Verifies ownership.

## UI Components

### ResourceWeeklyScheduleEditor

- Displays all 7 days
- Add/remove periods per day
- Time inputs (start/end) with 5-minute steps
- Location selector (when multiple locations exist)
- Dirty detection and conditional save button
- Client-side overlap detection (server is authoritative)

### ResourceTimeOffList

- Shows future time-off entries
- Date/time formatting with full-day indicator
- Location chips
- Edit and delete actions with confirmation dialog

### ResourceTimeOffForm

- Title, notes, location, full-day toggle
- Date and time inputs (time hidden for full-day)
- End date is inclusive in UI, exclusive in storage
- Yup validation with cross-field checks

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/resources/[id]/edit` | Working hours editor + time-off list |
| `/${tenantSlug}/resources/[id]/time-off/new` | Create time off |
| `/${tenantSlug}/resources/[id]/time-off/[timeOffId]/edit` | Edit time off |

## Active-State Semantics

| Flag | Controls |
|------|----------|
| `resources.is_active` | Resource generally active |
| `resource_working_hours.is_active` | Period participates in future availability |
| `resource_time_off.is_active` | Exception blocks future availability |

A future availability engine considers a working period only when both the resource and the period are active.

## Location Semantics

A working-hour row with a location means the resource is scheduled at that location during that period. It does not mean every assigned service is available there. Future scheduling requires intersection of service-locations, service-resources, resource-working-hours, and resource-time-off.

## Deletion Behavior

| Event | Behavior |
|-------|----------|
| Resource deleted | Working hours + time off CASCADE deleted |
| Location deleted | Location-specific rows CASCADE deleted |
| Tenant deleted | All rows CASCADE deleted |
| Working period deleted | Resource/location unaffected |
| Time off deleted | Resource/location unaffected |

## Permissions

| Role | View | Manage Schedule | Manage Time Off |
|------|------|----------------|-----------------|
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Manager | Yes | No | No |
| Staff | Yes | No | No |

## Verification Steps

```bash
# 1. Apply migration
# supabase/migrations/20250805000012_resource_schedules.sql

# 2. Regenerate database types
npm run db:types

# 3. Verify
npm run lint
npm run type-check
npm run build
```

## Deferred Functionality

- Availability calculations
- Time-slot generation
- Appointment conflict detection
- Calendar UI (day/week/month views)
- Booking rules (min notice, max advance)
- Public booking pages
- Recurring appointments
- Business-wide holidays
- External calendar sync
- Overnight shift support
- Drag-and-drop scheduling

## Assumptions

1. `update_updated_at_column()` trigger function exists.
2. Resources, locations, and tenants tables exist.
3. Tenant time zone is authoritative for interpreting wall-clock times.
4. Working hours use wall-clock time; time off uses timestamptz.
5. Overlap prevention is trigger-based (not exclusion constraint) due to nullable location_id + is_active filtering.
6. Full-day end date is inclusive in UI, exclusive in storage.
7. Time off may occur outside normal working hours (vacations on non-work days are valid).
8. No availability engine exists yet — these tables provide input data only.
