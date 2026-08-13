# 106 — Analytics Depth, Utilization & Trends

> Milestone 15.9.1

## Overview

Completes the advanced analytics layer with real resource utilization, real trend series, detailed sub-pages, and chart components.

## Utilization Formula

```
utilization = booked_eligible_minutes / available_eligible_minutes
```

### Booked Eligible Minutes

- SUM(duration_minutes) from `appointments`
- WHERE `status != 'cancelled'`
- No-show time counts as booked (resource was occupied)
- Within selected date range

### Available Eligible Minutes

For each day in the date range:
1. Load `resource_working_hours` for that `day_of_week` and applicable `location_id`
2. Intersect with `location_working_hours` (if location filter active)
3. Subtract `resource_time_off` (with overlap merging)
4. Sum remaining minutes

### Working Hours

- Source: `resource_working_hours` table
- `location_id = NULL` means hours apply to all assigned locations
- `location_id = specific` means location-specific schedule
- `is_active = true` filter applied
- ISO weekday (1=Mon, 7=Sun)

### Location Constraints

- Source: `location_working_hours` table
- If location is closed (`is_closed = true`), available = 0 for that day
- Resource hours are intersected with location operating hours

### Time Off

- Source: `resource_time_off` table
- `location_id = NULL` blocks all locations
- `is_active = true` filter applied
- Clipped to day boundaries
- **Overlapping intervals merged** before subtraction (prevents double-counting)

### Overlap Merging

```
Working: 09:00–17:00
Time off A: 12:00–14:00
Time off B: 13:00–15:00
Merged: 12:00–15:00 (subtract once, not 4 hours)
```

### Non-Human Resources

Utilization applies identically to all resource types (staff, rooms, chairs, equipment). Uses `resources` table identity, not `staff_profiles`.

### Multi-Location

If location filter is active, only that location's hours are considered. If no filter, resource working hours across all locations contribute (conservative: each day uses the resource's configured hours for their assigned locations).

## Trend Series

### Metrics

- **Appointment trend**: total, completed, cancelled, no-show per bucket
- **Customer trend**: new customers, returning customers per bucket

### Bucket Granularity

| Range | Bucket |
|-------|--------|
| <= 90 days | Day |
| <= 365 days | Week |
| > 365 days | Month |

### Zero-Fill

Every bucket in the range appears with 0 values if no data exists. No missing gaps for charts to guess.

### Timezone

Tenant `default_timezone` determines day boundaries. Datetime → zoned → bucket key. DST transitions handled by date-fns-tz.

### Bounded Output

Maximum 400 bucket points per query. Prevents unbounded output for large ranges.

## Detailed Report Pages

| Route | Content |
|-------|---------|
| `/{slug}/analytics` | Overview — summary metrics + financial per currency |
| `/{slug}/analytics/appointments` | Trend chart + rates + totals |
| `/{slug}/analytics/customers` | Retention metrics + customer trend |
| `/{slug}/analytics/services` | Ranked service table (25 max) |
| `/{slug}/analytics/staff` | Resource utilization table |
| `/{slug}/analytics/locations` | Location performance table |
| `/{slug}/analytics/finance` | Per-currency financials + packages + gift cards (owner/admin only) |
| `/{slug}/analytics/marketing` | Campaigns + automations + referrals |

## Shared Components

- `AnalyticsNav` — Tab navigation across all analytics pages
- `AnalyticsPeriodSelector` — URL-based period selection (preserves page path)
- `SimpleBarChart` — Lightweight MUI-based bar chart (no external dependency)

## Chart Library Decision

**No external chart library added.** Using `SimpleBarChart` component built with MUI Box/Typography/Tooltip. Accessible: values shown as text, tooltips, ARIA labels. Sufficient for current needs without adding bundle weight.

## Financial Semantics

- Currencies never summed across types (RSD + EUR impossible)
- Collected = settled payments (appointment_payments + package_purchases)
- Refunded = succeeded refunds
- Net = collected - refunded
- Gift card sale ≠ service collection (separate section)
- Package purchase only counted when payment confirmed

## Customer Retention

Definitions unchanged from 15.9:
- Repeat rate: customers with >=2 completed / customers with >=1 completed
- New: first completed in period
- Returning: had prior completed before period
- Inactive: no completed in 90 days AND no upcoming

## Performance

- Utilization: iterates days in range (max 366), pure interval math
- Trends: single DB query per series, bounded 10000 rows, client-side bucketing
- Sub-pages: bounded queries (limit 10000 appointments per aggregation)
- No N+1 patterns
- Tables bounded to 25 rows

## Deferred

- XLSX export (no heavy library added)
- Financial trend series over time
- Cohort retention visualization
- Per-service detail drill-down page
- Advanced comparison series in charts
- Short-term cache layer
- Customer-level financial attribution per resource
