# Location Business Hours and Closures

## Overview

Location business hours (Milestone 6.6) define when each location normally operates and when it has exceptional closures or modified hours. These are recurring weekly periods and date-specific exceptions.

Business hours do NOT create bookable slots. A future availability engine will intersect location hours with resource schedules, service assignments, and booking rules.

## Recurring Business-Hour Model

Locations have recurring weekly opening periods defined per day of week. Multiple periods per day support split openings (e.g., closed for lunch).

```
Monday    09:00–12:00, 14:00–18:00
Tuesday   09:00–17:00
Saturday  10:00–14:00
Sunday    Closed
```

## ISO Weekday Convention

Same as Milestone 6.5 (shared via `lib/scheduling/scheduling-constants.ts`):

| Value | Day |
|-------|-----|
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday |

## Tenant Time-Zone Semantics

- Weekly times stored as PostgreSQL `time` (wall-clock).
- Interpreted in the tenant's configured time zone, not UTC.
- Exception dates stored as PostgreSQL `date` (local calendar date).
- Custom exception periods stored as `time` (local wall-clock).
- No UTC conversion during persistence.
- Future availability engine converts local date/time to instants using tenant TZ.

## Database: `location_business_hours`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `location_id` | uuid | FK locations (CASCADE) |
| `day_of_week` | smallint | 1–7 ISO |
| `start_time` | time | Tenant-local |
| `end_time` | time | Tenant-local |
| `is_active` | boolean | Default true |
| `sort_order` | integer | Default 0, >= 0 |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

### Constraints

- `start_time < end_time` (no overnight)
- `day_of_week BETWEEN 1 AND 7`
- `sort_order >= 0`
- Tenant trigger validates location ownership
- Overlap trigger prevents overlapping active periods (same location + day)

## Database: `location_schedule_exceptions_v2`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `location_id` | uuid | FK locations (CASCADE) |
| `exception_date` | date | Local date |
| `exception_type` | text | `closed` or `custom_hours` |
| `title` | text | Nullable, 1–120 chars |
| `notes` | text | Nullable, max 2000 |
| `is_active` | boolean | Default true |

### Unique Constraint

```
UNIQUE (tenant_id, location_id, exception_date)
```

One exception per location per date.

## Database: `location_exception_periods`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK tenants (CASCADE) |
| `exception_id` | uuid | FK exceptions (CASCADE) |
| `start_time` | time | Tenant-local |
| `end_time` | time | Tenant-local |
| `sort_order` | integer | Default 0 |

### Constraints

- `start_time < end_time`
- Only allowed for `custom_hours` exceptions (trigger-enforced)
- Overlap trigger prevents overlapping periods within same exception

## Exception Types

### `closed`

Location is completely closed for the date. No periods allowed.

### `custom_hours`

Normal weekly hours are replaced by custom opening periods. At least one period required.

## Replacement Semantics (Resolution)

```
if active exception exists for date:
    if type == closed:  periods = []
    if type == custom_hours:  periods = exception.periods
else:
    periods = weekly_hours_for_weekday(date)
```

Implemented by `resolveLocationOperatingPeriods()` pure utility.

## Overlap Prevention

### Recurring hours

Trigger-based. Rejects overlapping active periods for same location + day. Adjacent is valid. Concurrency-safe.

### Exception periods

Trigger-based. Rejects overlapping periods within the same exception. Adjacent is valid.

## RLS Policies

All three tables: select (all members), insert/update/delete (owner/admin).

## RPCs

| RPC | Purpose |
|-----|---------|
| `set_location_business_hours(uuid, uuid, jsonb)` | Atomic weekly schedule replacement |
| `create_location_exception_v2(uuid, uuid, date, text, ...)` | Create exception with periods |
| `update_location_exception_v2(uuid, uuid, text, ...)` | Update exception, replace periods |
| `delete_location_exception_v2(uuid, uuid)` | Delete exception (cascades periods) |

## Shared Scheduling Utilities

`lib/scheduling/scheduling-constants.ts` provides:

- `DayOfWeek` type and constants
- `ALL_DAYS`, `DAY_LABELS`, `DAY_SHORT_LABELS`
- `TIME_FORMAT_REGEX`, `isValidTime`, `compareTime`
- `TimePeriod`, `periodsOverlap`, `findOverlappingPeriods`, `sortPeriods`
- `getIsoDayOfWeek` (JS Date → ISO day)

Shared between resource schedules and location business hours.

## UI Components

### LocationWeeklyHoursEditor

7-day view, add/remove periods, time inputs, dirty detection, save button.

### LocationScheduleExceptionList

Shows future exceptions with date, type, period summaries, edit/delete.

### LocationScheduleExceptionForm

Formik form: date, type select, title, notes, conditional custom periods with add/remove.

## Routes

| Route | Purpose |
|-------|---------|
| `/${tenantSlug}/locations/[id]/edit` | Business hours + exceptions sections |
| `/${tenantSlug}/locations/[id]/business-hours/exceptions/new` | Create exception |
| `/${tenantSlug}/locations/[id]/business-hours/exceptions/[excId]/edit` | Edit exception |

## Active-State Semantics

| Flag | Controls |
|------|----------|
| `locations.is_active` | Location generally active |
| `location_business_hours.is_active` | Period participates in resolution |
| `location_schedule_exceptions_v2.is_active` | Exception applies to date |

## Interaction With Resource Schedules

Resource and location hours are independent constraints. Valid for:

```
Resource works Mon 08:00–17:00
Location opens Mon 09:00–16:00
```

Future availability: intersection → 09:00–16:00. NOT calculated in this milestone.

## Interaction With Location Closures

A closure does not modify resource schedules. It remains a separate location-level constraint applied during future availability resolution.

## Deletion Behavior

| Event | Result |
|-------|--------|
| Location deleted | Business hours + exceptions + periods CASCADE deleted |
| Exception deleted | Its periods CASCADE deleted |
| Period deleted | Parent exception unaffected |
| Tenant deleted | All related data CASCADE deleted |

## Permissions

| Role | View | Manage Hours | Manage Exceptions |
|------|------|-------------|-------------------|
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Manager | Yes | No | No |
| Staff | Yes | No | No |

## Verification Steps

```bash
# 1. Apply migration
# supabase/migrations/20250805000013_location_business_hours.sql

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
- Resource/location hours intersection
- Booking rules and appointments
- Calendar UI
- Public opening-hours pages
- Business-wide holiday templates
- Country holiday imports
- External calendar sync

## Assumptions

1. `update_updated_at_column()` exists.
2. Locations and tenants tables exist.
3. Used `_v2` suffix for exception tables to avoid conflict with existing `location_schedule_exceptions` from Milestone 5.4.
4. Tenant time zone is authoritative for local time interpretation.
5. Overnight periods not supported (start < end enforced).
6. Exception replacement model: custom_hours fully replaces weekly hours for that date.
7. No availability engine exists yet — tables provide input data only.
