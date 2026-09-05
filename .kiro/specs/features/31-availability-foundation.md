# Availability Calculation Foundation (Milestone 6.7)

## Overview

The availability engine determines candidate time slots for a selected tenant, service, location, resource, and local date. It is deterministic, tenant-safe, time-zone aware, and reusable by later booking workflows.

A returned slot means:

> Based on current configuration inputs, this service-resource-location combination has enough uninterrupted operating time.

It does NOT mean the slot is reserved, conflicts have been checked, or the result will remain valid after it is returned.

## Request Model

```ts
type AvailabilityRequest = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  resourceId?: string | null;
  localDate: string;          // "YYYY-MM-DD"
  slotIntervalMinutes?: number; // Default: 15, min: 5, max: 120
};
```

- `localDate` is interpreted in the tenant's authoritative timezone.
- When `resourceId` is supplied, calculate for that resource only.
- When omitted, calculate independently for all eligible resources.

## Result Model

```ts
type AvailabilityResult = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  localDate: string;
  timeZone: string;
  resources: ResourceAvailabilityResult[];
  reasonCode?: AvailabilityReasonCode;
  totalSlots: number;
};
```

Each `ResourceAvailabilityResult` contains resource attribution and an array of `AvailabilitySlot` with service start/end, occupied window, local times, duration, buffers, price, currency, and source indicators.

## Eligibility Requirements

A candidate resource is eligible only when ALL of:

- Tenant is accessible (active status)
- Service is active
- Location is active
- Resource is active
- Service-location assignment is active
- Service-resource assignment is active
- Resource-location assignment is active

## Active-State Filtering

- Inactive service → no slots
- Inactive location → no slots
- Inactive resource → excluded from candidates
- Inactive service-location assignment → `SERVICE_NOT_AT_LOCATION`
- Inactive service-resource assignment → excluded
- Inactive resource working period → ignored
- Inactive resource time off → does not block
- Inactive location exception → does not replace weekly hours
- Inactive location weekly period → ignored

## Tenant Isolation

Every database query includes tenant scope. The engine returns generic not-found behavior for cross-tenant entities. Reason codes do not reveal unauthorized cross-tenant existence. Pure calculation utilities receive already-authorized data and remain tenant-agnostic.

## Local Date Semantics

- `localDate` is a calendar date in the tenant's timezone
- Converted to exact instants using the tenant's IANA timezone
- Never parsed as UTC or browser-local time
- Past dates return empty (DATE_IN_PAST)
- Current date filters out slots whose service start is in the past

## Tenant Time-Zone Authority

The authoritative timezone comes from `tenants.default_timezone` (IANA identifier). It is NOT accepted from untrusted client input. All wall-clock times (business hours, working hours) are interpreted in this timezone.

## Location Period Resolution

For the requested local date:

1. Determine ISO weekday in tenant timezone
2. Check for active exception on that date:
   - `closed` → empty periods
   - `custom_hours` → use exception periods (replaces weekly)
3. No exception → use active weekly business hours for that weekday

Custom exception periods fully replace weekly hours. They are never combined.

## Resource Period Resolution

For each eligible resource on the requested weekday:

- Location-specific periods (`location_id = requested location`) always apply
- General periods (`location_id = NULL`) also apply when resource has an active resource-location assignment
- Both are combined and normalized (no duplicates)
- A resource-location assignment is required — general periods alone do not imply location compatibility

## Period Intersection

```
Effective location operating periods ∩ Effective resource working periods
```

Implemented as `intersectTimePeriods()` — a pure function operating on sorted `HH:mm` period arrays. Returns only positive-length intersections.

## Time-Off Subtraction

After converting periods to exact instants, time-off is subtracted:

- Global time off (`location_id = NULL`) blocks all locations
- Location-specific time off blocks only that location
- Time off for other locations is ignored
- Half-open intervals: `[starts_at, ends_at)`

Implemented as `subtractInstantRanges()` — merges overlapping blocks first, then subtracts from available ranges.

## Duration and Buffer Fitting

```
occupied_start = service_start - buffer_before
service_end    = service_start + duration
occupied_end   = service_end + buffer_after
```

The full occupied window must fit inside one uninterrupted available range. Buffers cannot cross closure boundaries, shift gaps, or time-off blocks.

## Slot Alignment

Candidate service start times align to a configurable interval relative to local midnight:

- Default: 15 minutes
- Min: 5, Max: 120
- Must be a whole integer
- Alignment in tenant-local wall-clock time (not Unix epoch)

## Candidate Generation

For each uninterrupted available range:

1. Find first aligned service start at or after `range_start + buffer_before`
2. Compute occupied window
3. If occupied window fits in range, emit slot
4. Advance by interval
5. Stop when occupied window no longer fits

The slot interval is NOT the service duration unless explicitly configured.

## DST Policy

Uses `date-fns-tz` with `TZDate` for timezone-aware conversion.

- **Nonexistent local times (spring-forward):** Slots in the gap are skipped. TZDate advances them forward, creating misalignment with the interval grid.
- **Ambiguous local times (fall-back):** The earlier occurrence is used (TZDate default behavior).
- **Normal dates:** Standard conversion with no special handling.

Covered by deterministic tests using `America/New_York` DST transitions.

## Past-Time Filtering

- Past dates (`localDate < today in tenant TZ`): return empty, `DATE_IN_PAST`
- Current date: exclude slots whose service start is before `now`
- Future dates: no past-time filtering
- `now` is injected for deterministic testing

## Reason Codes

```ts
type AvailabilityReasonCode =
  | "SERVICE_INACTIVE"
  | "LOCATION_INACTIVE"
  | "SERVICE_NOT_AT_LOCATION"
  | "NO_ELIGIBLE_RESOURCES"
  | "RESOURCE_INACTIVE"
  | "RESOURCE_NOT_AT_LOCATION"
  | "LOCATION_CLOSED"
  | "NO_RESOURCE_WORKING_HOURS"
  | "FULLY_BLOCKED_BY_TIME_OFF"
  | "PERIOD_TOO_SHORT"
  | "DATE_IN_PAST"
  | "NO_SLOTS";
```

These are internal diagnostics, not customer-facing copy.

## Query Strategy

Tenant-scoped server-side queries avoid N+1:

- Bulk load resources by IDs
- Bulk load resource-location assignments
- Bulk load working hours for all eligible resources
- Range-overlap predicate for time off (`starts_at < dayEnd AND ends_at > dayStart`)
- Active-state fields in all queries

## Management Preview

Route: `/${tenantSlug}/services/${serviceId}/availability`

- Select location, date, optional resource, slot interval
- Results grouped by resource showing slot times, buffers, price, source
- Labeled "Availability preview" with warning: "Preview only. These times are not reserved and may change."
- No booking button, not publicly exposed

## Performance Limits

- One local date per request
- Max 50 eligible resources per request
- Max 200 slots per resource
- Slot interval minimum 5 minutes
- No unbounded date-range calculations

## Testing Coverage

Test files in `lib/scheduling/__tests__/`:

- `local-time-periods.test.ts` — normalization, intersection, alignment
- `instant-ranges.test.ts` — merge, subtraction with various block patterns
- `slot-generation.test.ts` — exact fit, too short, buffers, split shifts, intervals, past filtering, duplicates
- `dst-behavior.test.ts` — spring-forward, fall-back, normal dates using America/New_York

All tests use fixed timestamps and timezone identifiers. No machine-local-time dependencies.

## Deferred: Appointment Conflicts

This milestone does NOT check appointment conflicts. A future milestone will subtract existing appointments from available ranges before slot generation.

## Deferred: Booking Rules

Not implemented: minimum notice, maximum advance booking, cutoff times, cancellation rules, booking capacity.

## Manual Verification Steps

```bash
# Install vitest if not already installed
npm install -D vitest

# Run verification
npm run lint
npm run type-check
npm run test
npm run build
```

## Assumptions

1. `tenants.default_timezone` contains a valid IANA timezone identifier.
2. Working hours use ISO weekday (1=Mon..7=Sun) and `HH:mm` wall-clock time.
3. Time off uses `timestamptz` with half-open intervals.
4. Location exceptions use the v2 replacement model.
5. Resource-location assignment is required for eligibility (general working hours alone do not imply compatibility).
6. Service value resolution uses nullish coalescing (preserves explicit zero).
7. Price is represented as string in slot output to avoid floating-point issues.
8. Calculations use current persisted active configuration (no caching).
9. No appointments, reservations, public booking, or payments are implemented.
