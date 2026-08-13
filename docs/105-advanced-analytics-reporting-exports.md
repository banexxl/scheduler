# 105 — Advanced Analytics, Reporting & Exports

> Milestone 15.9

## Overview

Tenant-scoped analytics and reporting layer providing operational, customer, financial, and marketing insights with CSV exports and saved reports.

## Metric Definitions

| Metric | Definition | Source |
|--------|-----------|--------|
| Total appointments | COUNT(*) in date range | appointments table |
| Completed | status = 'completed' | appointments |
| Cancelled | status = 'cancelled' | appointments |
| No-shows | status = 'no_show' | appointments |
| Completion rate | completed / (completed + cancelled + no_show) | Derived |
| Cancellation rate | cancelled / (completed + cancelled + no_show) | Derived |
| No-show rate | no_show / (completed + no_show) | Derived |
| Collected | SUM(amount_paid) WHERE status IN (paid, partially_refunded, refunded) | appointment_payments |
| Refunded | SUM(amount_refunded) | appointment_payments |
| Net collected | collected - refunded | Derived |
| New customers | First completed appointment in period | appointments + customer_id |
| Returning customers | Had prior completed appointment before period | appointments |
| Repeat rate | customers with >=2 completed / customers with >=1 completed | get_customer_retention_analytics |
| Inactive | No completed in 90 days AND no upcoming | tenant_customers + appointments |
| Utilization | bookedMinutes / availableMinutes (from resource_working_hours) | Derived (null until available minutes calculated) |

## Currency Safety

**Critical invariant:** RSD, EUR, USD are NEVER summed together.

All financial metrics are grouped by currency:

```
Net collected
  RSD 420,000
  EUR 1,240
```

Never: `421,240 total`

## Date Range & Timezone

**Supported periods:** today, 7days, 30days, this_month, prev_month, this_quarter, this_year, custom

**Timezone:** `tenants.default_timezone` (IANA) is authoritative. Converted to UTC boundaries server-side.

**Comparison:** Each period has a previous equivalent (e.g., last 30d vs previous 30d). Returns percentage change. Handles prior=0 safely (returns null, not Infinity).

**Custom range max:** 1825 days (~5 years).

## Financial Semantics

- **Collected**: Total settled payments (appointment_payments.amount_paid + package purchases) WHERE status IN (paid, partially_refunded, refunded)
- **Refunded**: From appointment_payment_refunds WHERE status = 'succeeded'
- **Net collected**: collected - refunded
- **Gift card sale**: Counted in gift card analytics, NOT in appointment service collection
- **Gift card redemption**: Reduces gift card outstanding balance, NOT counted as new collection
- **Package purchases**: Counted when payment confirmed, NOT when manually assigned

## Reports

| Route | Content |
|-------|---------|
| `/{slug}/analytics` | Overview — appointment, customer, financial cards |
| `/{slug}/analytics/appointments` | Appointment detail (future) |
| `/{slug}/analytics/customers` | Customer retention (future) |
| `/{slug}/analytics/services` | Service performance (future) |
| `/{slug}/analytics/staff` | Staff/resource performance (future) |
| `/{slug}/analytics/locations` | Location performance (future) |
| `/{slug}/analytics/finance` | Per-currency financials (future) |
| `/{slug}/analytics/marketing` | Campaign + automation metrics (future) |

## Saved Reports

**Table:** `saved_analytics_reports`
- Stores report type + filters (JSONB)
- Does NOT store results (always re-evaluated)
- Filters validated against allowlist (structured, not arbitrary SQL)
- Tenant-scoped via RLS

## Exports

- **Format:** CSV (UTF-8, proper escaping)
- **Generation:** Server-side from validated filters
- **Row limit:** 10,000 (bounded)
- **Security:** Requires authenticated tenant member, finance exports require owner/admin
- **Route:** `GET /api/internal/analytics/export?tenantId=...&reportType=...&period=...`
- **Logging:** `analytics.export` with reportType, format, rowCount (never customer rows)

## Authorization

- General analytics: any active tenant member
- Financial reports/exports: owner, admin only
- Saved report mutations: owner, admin, manager

## Performance

- All primary metrics: PostgreSQL aggregation via RPCs
- Existing `get_dashboard_analytics_summary` RPC: single round-trip for appointment metrics
- New RPCs: `get_customer_retention_analytics`, `get_marketing_analytics_summary`, `get_package_analytics`, `get_gift_card_analytics`
- No full history loaded into Node
- Exports bounded to 10,000 rows
- Tables/lists paginated

## Deferred

- XLSX export (would require heavy library dependency)
- Cohort retention charts
- Utilization calculation (available minutes calculation)
- Customer-level trend data population
- Real-time chart library (using simple MUI metric cards)
- Short-term caching layer
- Sub-pages for each analytics section (only overview page built in this iteration)
