# Business Dashboard & Analytics

**Milestone 8.4**

## Overview

Tenant dashboard providing operational visibility and business insights from existing appointment, CRM, service, resource, and location data. Answers: How busy are we? What happened this period? Which services/resources are popular? Are cancellations increasing?

## Route

```
/{tenantSlug}/dashboard
```

Main business landing page. No separate analytics route needed for this milestone.

## Architecture

```
page.tsx (server)
  → auth + tenant resolution
  → period from URL params
  → getDashboardAnalytics(tenantId, timezone, currency, filters)
  → DashboardAnalyticsDTO
  ↓
client-page.tsx (client)
  → period filter (ToggleButtonGroup)
  → summary cards
  → trend chart
  → rankings
  → breakdowns
```

Strict server/client separation. Only serializable DTOs cross the boundary.

## Date Range Model

Periods resolved using tenant timezone (never browser timezone):

| Period | Start | End |
|--------|-------|-----|
| Today | Tenant-local midnight today | Tenant-local midnight tomorrow |
| 7 Days | 6 days ago midnight | Tomorrow midnight |
| This Month | Month start midnight | Tomorrow midnight |
| Prev Month | Previous month start | Previous month end + 1 day |

All boundaries use `fromZonedTime` for DST-safe instant conversion.

## Tenant Timezone Behavior

- All period boundaries computed in tenant IANA timezone
- Display dates formatted in tenant timezone
- No browser timezone used as business authority
- DST transitions handled correctly (spring-forward = 23h day, fall-back = 25h day)

## Comparison Period

Each period has an equivalent previous period for delta comparison:

| Period | Comparison |
|--------|-----------|
| Today | Yesterday |
| 7 Days | Previous 7 days (days 7–13 ago) |
| This Month | Previous month |
| Prev Month | 2 months ago |

Comparison shows percentage change for counts, percentage-point change for rates.

## Summary Metrics

### Today Row
- Total, Upcoming, Checked In, In Progress, Completed, Cancelled, No-Show

### Period Row
- Appointments (with % change vs previous)
- Completed (with % change)
- Completed Value (with % change)
- Average Value
- Completion Rate
- Cancellation Rate (with % change)
- No-Show Rate (with pts change)
- Customers (new / returning)

## Metric Definitions

### Appointment Value Terminology

**Booked value**: Sum of appointment price snapshots for non-cancelled appointments.

**Completed appointment value**: Sum of appointment price snapshots for completed appointments.

These are NOT revenue, income, or sales. No payment processing exists. Label clearly as "appointment value."

### Cancellation Rate
```
cancelled / (completed + cancelled + no_show)
```
Past appointments only. Excludes future/pending.

### No-Show Rate
```
no_show / (completed + no_show)
```
Documented denominator avoids including cancelled in no-show calculation.

### Completion Rate
```
completed / (completed + cancelled + no_show)
```
Past appointments only.

### Average Appointment Value
```
completed appointment value / completed count
```

### New Customer
A customer whose first appointment (by email) occurs within the selected range.

### Returning Customer
A customer with at least one appointment before the range AND another in the range.

## Appointment Trend Chart

SVG line chart (no external library). Series:
- Total (solid blue)
- Completed (dashed green)
- Cancelled (dashed red)

Daily granularity. Legend with period totals. Accessible ARIA label.

## Top Services

Ranked by appointment count. Shows:
- Service name (from snapshot, grouped by service_id)
- Booking count
- Completed count
- Completed value

Top 8 displayed. Historical data preserved even for inactive/renamed services.

## Resource Analytics

Ranked by appointment count. Shows:
- Resource name
- Appointment count
- Completed count
- Scheduled minutes (sum of duration_minutes)

Neutral wording — not "performance" or "productivity."

### Utilization (future enhancement)
Definition when implemented:
```
scheduled occupied minutes / configured working minutes
```
Not included in initial release due to complexity of working-hour intersection.

## Location Analytics

Table with per-location:
- Appointment count
- Completed count
- Cancelled count
- No-show count
- Completed value

Only shown for multi-location tenants.

## Booking Source Breakdown

From appointment `source` column:
- Internal
- Public Booking
- Walk-in
- Phone
- Online

Horizontal progress bars with count and percentage.

## Status Breakdown

All statuses with colored progress bars:
- Pending (orange)
- Confirmed (blue)
- Checked In (cyan)
- In Progress (purple)
- Completed (green)
- Cancelled (red)
- No-Show (grey)

## Historical/Inactive Entity Behavior

Analytics include appointments for:
- Inactive resources
- Inactive services
- Inactive locations

Historical data is never hidden because an entity was deactivated. Grouping uses entity ID; display uses current name with snapshot fallback.

## Query Strategy

Single orchestrator `getDashboardAnalytics` loads:
1. Period appointments (max 5000 rows)
2. Comparison period appointments (max 5000 for delta)
3. Today summary via existing `getTodaySummary`
4. Customer prior-appointment lookup for new/returning classification

All queries tenant-scoped via RLS. No N+1. No unbounded all-time queries.

## Performance Bounds

- Maximum 5000 appointments per query
- Maximum 365-day analytics range
- No persistent caching (request-level only)
- Trends limited to date series within range
- Rankings limited to top 8–10 entries

## Dashboard Filters

- Period (Today / 7 Days / This Month / Prev Month) — URL param `?period=`
- Location filter ready in DTO (`locationId` param)
- Resource filter ready in DTO (`resourceId` param)

## Mobile Behavior

- Summary cards stack in 2-column grid
- Chart scrolls horizontally if needed
- Rankings use compact tables
- Filters use standard MUI toggle buttons

## Chart Accessibility

- SVG `role="img"` with `aria-label` summarizing data
- Text legend below chart with numeric totals
- No reliance on color alone (different line styles: solid/dashed)
- Y-axis and date labels in SVG text

## Zero/Empty States

All components handle empty data:
- "No appointment data for this period"
- "No service data for this period"
- "No customer activity this period"
- Comparison returns `null` when no baseline exists (no misleading "0% growth")

## Server/Client Boundary

| Layer | Responsibility |
|-------|---------------|
| `page.tsx` | Auth, tenant, period resolution, query, DTO assembly |
| `client-page.tsx` | Filter state, layout, chart rendering, interactions |

No functions, icon constructors, Supabase clients, or service instances cross the boundary.

## Tests

- `analytics-date-ranges.test.ts`: 14 tests for period resolution, comparison ranges, date series
- `analytics-types.test.ts`: Constants validation
- All use fixed dates and explicit timezones

## Files Created

```
features/analytics/types/analytics.ts
features/analytics/services/analytics-date-ranges.ts
features/analytics/services/get-dashboard-analytics.ts
features/analytics/components/dashboard-summary-cards.tsx
features/analytics/components/appointment-trend-chart.tsx
features/analytics/components/customer-trend-card.tsx
features/analytics/components/top-services-card.tsx
features/analytics/components/resource-analytics-card.tsx
features/analytics/components/location-breakdown-card.tsx
features/analytics/components/booking-source-card.tsx
features/analytics/components/status-breakdown-card.tsx
features/analytics/__tests__/analytics-date-ranges.test.ts
features/analytics/__tests__/analytics-types.test.ts
app/(business)/[tenantSlug]/dashboard/client-page.tsx
```

## Files Modified

```
app/(business)/[tenantSlug]/dashboard/page.tsx
```

## Assumptions

- Appointment `price` snapshot is reliable for value calculations
- Tenant timezone is set and valid
- Customer identity uses email (lowercase) for new/returning classification
- No payment processing exists — value ≠ revenue
- Working-hour intersection for utilization deferred to future milestone

## Explicitly Not Implemented

- Platform-admin analytics
- MRR/ARR/SaaS revenue
- Appointment payment revenue
- Accounting/tax reports
- Payroll/commissions
- Forecasting/AI insights
- Custom report builder
- CSV/Excel exports
- Scheduled reports
- Marketing segmentation
- Advanced cohort analysis
