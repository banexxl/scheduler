# Working Hours

## Overview

Working hours define the weekly opening schedule for each location. Every location has exactly 7 rows (one per day of the week) auto-initialized by a database trigger.

## Scheduling Hierarchy

```
Business
    │
    ▼
Location Working Hours     ← This milestone
    │
    ▼
Resource Working Hours     (future override)
    │
    ▼
Service Duration           (future)
    │
    ▼
Bookings                   (future)
```

Working hours are the foundation of the scheduling system. Resources and services will later inherit or override location hours.

## Database

### Table: `location_working_hours`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `location_id` | uuid | FK → locations (CASCADE) |
| `day_of_week` | smallint | 0=Sunday, 1=Monday, ..., 6=Saturday |
| `is_closed` | boolean | Default false |
| `opens_at` | time | NULL when closed |
| `closes_at` | time | NULL when closed |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

Unique constraint: `(location_id, day_of_week)`

### Auto-Initialization Trigger

`trg_initialize_location_working_hours` fires AFTER INSERT on `locations`.

Default schedule:
- Mon–Fri: 09:00–17:00
- Saturday: 09:00–13:00
- Sunday: Closed

This ensures every location starts with valid hours. No application-level initialization needed.

### RPC: `replace_location_working_hours`

```sql
replace_location_working_hours(target_location_id uuid, hours jsonb) → boolean
```

- SECURITY DEFINER with empty search_path
- Verifies owner/admin role via `tenant_members`
- Validates exactly 7 entries
- Validates opens_at < closes_at for open days
- Atomically replaces all 7 rows (DELETE + INSERT)
- Restricted to `authenticated` role

Input format:
```json
[
  { "dayOfWeek": 1, "isClosed": false, "opensAt": "09:00", "closesAt": "17:00" },
  { "dayOfWeek": 2, "isClosed": false, "opensAt": "09:00", "closesAt": "17:00" },
  ...
  { "dayOfWeek": 0, "isClosed": true, "opensAt": null, "closesAt": null }
]
```

## RLS Policies

| Policy | Operation | Access |
|--------|-----------|--------|
| `working_hours_select_member` | SELECT | All active tenant members |
| `working_hours_update_owner_admin` | UPDATE | Owner/admin only |

No INSERT/DELETE policies for users — managed by trigger and RPC only.

## Permissions

| Role | Access |
|------|--------|
| Owner | Edit |
| Admin | Edit |
| Manager | Read-only |
| Staff | Read-only |

## Route

`/${tenantSlug}/locations/[locationId]/working-hours`

## UI

Seven day cards displayed vertically (Monday–Sunday):
- Day name
- Open/Closed checkbox
- Time inputs (24h format, 15-min increments) — disabled when closed

### Convenience Actions (client-side only)

- **Apply Monday to All** — copies Monday's hours to all 7 days
- **Apply to Weekdays** — copies Monday's hours to Mon–Fri
- **Apply to Weekends** — copies Saturday's hours to Sat + Sun

Nothing is saved until the user clicks Save.

## Validation

- If open: `opens_at` and `closes_at` required, opens_at < closes_at
- If closed: opens_at and closes_at must be null
- Exactly 7 day entries required
- Validated both client-side (Yup) and server-side (RPC)

## File Structure

```
features/working-hours/
├── actions/
│   └── update-location-working-hours.ts
├── components/
│   ├── working-hours-form.tsx
│   ├── working-hours-day.tsx
│   └── working-hours-toolbar.tsx
├── schemas/
│   └── location-working-hours-schema.ts
├── services/
│   └── get-location-working-hours.ts
└── types/
    └── working-hours.ts
```

## Future Inheritance Model

The `features/working-hours/` module is designed to be reusable:
- Resource schedules will override location hours
- Holiday exceptions will override specific dates
- Temporary schedule changes will override ranges
- The scheduling engine will compute availability from this hierarchy

## Deferred

- Split shifts / multiple intervals per day
- Lunch breaks
- Overnight shifts (closes_at < opens_at)
- Holiday exceptions
- Seasonal hours
- Temporary overrides
- Resource-level overrides
- Recurring schedule templates
- Availability calculation engine
