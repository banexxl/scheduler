# Business Dashboard

## Overview

The business dashboard (`/${tenantSlug}/dashboard`) is the first page a business owner sees after creating their business. It provides a server-rendered overview of the business state.

## Authorization

- Route protected by `requireTenantMember(tenantSlug)` in the layout
- Returns 404 if user is not an active member of an active tenant
- Dashboard service receives the already-authorized `tenantId`
- Uses normal authenticated server client (never admin client)
- All queries respect RLS

## Data Sources

| Data | Table | Strategy |
|------|-------|----------|
| Business details | `tenants` | Single row by ID |
| Primary location | `locations` | `is_primary = true`, `maybeSingle()` |
| Subscription | `tenant_subscriptions` + `subscription_plans` | Join, `maybeSingle()` |
| Location count | `locations` | Exact count, head-only |
| Team member count | `tenant_members` | Exact count, `status = active` |
| Customer count | `tenant_customers` | Exact count, head-only |

All independent queries run in parallel via `Promise.all`.

## Dashboard Service

`features/business/services/get-business-dashboard.ts`

Returns `BusinessDashboardData`:
- `business` — name, slug, status, timezone, currency, created date
- `primaryLocation` — name, type, timezone, city, country (nullable)
- `subscription` — status, plan name, billing interval, trial end, period end, cancellation flag (nullable)
- `counts` — locations, active team members, customers

## UI Components

| Component | Purpose |
|-----------|---------|
| `business-dashboard-header.tsx` | Business name, status chip, role chip, public URL preview |
| `dashboard-stat-card.tsx` | Reusable stat card (label + value + helper text) |
| `primary-location-card.tsx` | Location details or empty state |
| `subscription-summary-card.tsx` | Subscription status, plan, dates, or unavailable state |
| `getting-started-card.tsx` | Next-action links for new businesses |

## Missing-Data Handling

| Scenario | Behavior |
|----------|----------|
| No primary location | "No primary location configured." — dashboard still loads |
| No subscription | "Subscription information is unavailable." — no false active status |
| Zero customers | Count shows 0 with helpful message about bookings |
| Service error | Alert: "Unable to load dashboard data." |

## Status Labels

Human-readable labels mapped from database values:

**Business:** Active, Trialing, Past Due, Suspended, Cancelled, Archived

**Subscription:** Trialing, Active, Past Due, Cancelled, Expired, Suspended, Incomplete

**Roles:** Owner, Admin, Manager, Staff

Each status has an associated MUI Chip color. Color is never the only indicator.

## Date Formatting

Uses `en-GB` locale for stable server/client rendering (e.g. "20 August 2026").
Handles null dates gracefully. No hydration mismatch.

## Terminology

| Internal | User-facing |
|----------|-------------|
| `tenants` | Business |
| `tenant_members` | Team |
| `tenant_customers` | Customers |
| `locations` | Locations |
| `tenant_subscriptions` | Subscription |

## Navigation Links

All links use the current tenant slug:
- `/${tenantSlug}/settings`
- `/${tenantSlug}/locations`
- `/${tenantSlug}/team`
- `/${tenantSlug}/billing`

## Security

- Authenticated tenant membership required
- Changing URL slug does not reveal another business (404)
- Normal server client used (never admin/service-role)
- RLS remains active
- No customer-private data returned beyond count
- No subscription provider secrets displayed
- No raw database errors reach the UI

## Initial State After Business Creation

- 1 location (primary)
- 1 active team member (owner)
- 0 customers
- Trialing subscription

## Not Implemented

- Scheduling / appointments / calendar
- Services / resources
- Charts / analytics history
- Reviews / themes / uploads
- Payment checkout
- Notifications
- Public tenant-site behavior
