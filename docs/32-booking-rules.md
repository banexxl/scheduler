# 32 — Booking Rules and Availability Policies (Milestone 6.8)

## Overview

Booking rules define constraints on **when** candidate availability slots may be offered for booking. They are separate from operational availability (which determines where a service *could* fit) and answer:

> Which of those candidate times are permitted by booking policy?

Booking rules do NOT implement: appointments, reservations, holds, payments, notifications, or public booking pages.

---

## Tenant Defaults

Every tenant may define one set of default booking rules. When no row exists, the application falls back to hardcoded defaults:

| Field | Default |
|-------|---------|
| Minimum notice | 0 minutes |
| Maximum advance | 90 days |
| Slot interval | 15 minutes |
| Cancellation notice | 0 minutes |
| Reschedule notice | 0 minutes |
| Same-day booking | Allowed |
| Customer cancellation | Allowed |
| Customer rescheduling | Allowed |
| Phone required | No |
| Email required | Yes |

Tenant rules are created lazily via upsert when first saved. The absence of a row does not cause availability to fail.

---

## Service Overrides

Each service may have at most one override row. Override fields are **nullable** — a null value means "inherit from tenant default."

### Null Inheritance (Nullish Resolution)

Resolution uses **nullish coalescing** (`??`), not truthy evaluation (`||`):

```
service override ?? tenant default ?? application default
```

This preserves:
- Explicit `0` (e.g., zero minimum notice)
- Explicit `false` (e.g., same-day booking disabled)

### Boolean Tri-State

Boolean override fields support three states:
- `null` — inherit from tenant
- `true` — explicitly allow
- `false` — explicitly disallow

The UI uses radio groups (Inherit / Allow / Do not allow) since a normal checkbox cannot represent three states.

---

## Rule Precedence

```
1. Active service override (non-null field value)
2. Tenant booking rules row
3. Application default constants
```

An inactive service override (`is_active = false`) is treated as if it does not exist.

---

## Minimum Notice Semantics

Minimum notice defines how soon before service start a booking may be created.

```
earliest permitted service start = now + minimum_notice_minutes
```

A candidate slot is allowed only when: `slot.startsAt >= earliest permitted start`

The exact instant is used for comparison. The threshold itself is not rounded.
Slots remain aligned to the slot interval grid.

**Example:**
```
Current time: 10:07
Minimum notice: 60 minutes
Threshold: 11:07
15-minute grid
→ First permitted aligned slot: 11:15
```

---

## Maximum Advance Semantics

Maximum advance defines the furthest local booking date.

```
latest allowed local date = tenant-local current date + maximum_advance_days
```

The entire latest local date remains eligible. This uses the **tenant time zone**, not UTC.

**Example:**
```
Current local date: August 6
Maximum advance: 30 days
Latest allowed date: September 5
```

---

## Same-Day Booking

When `allow_same_day_booking = false`:
- All slots for the tenant's **current local date** are removed
- Future dates remain eligible
- Uses tenant timezone for date determination, not server/browser date

---

## Slot Interval Source

The effective slot interval follows this priority:

1. Active service override `slot_interval_minutes`
2. Tenant booking rule `slot_interval_minutes`
3. Application default (15 minutes)

The availability preview includes a "Preview interval override" field for debugging that overrides the resolved value without changing persisted rules.

---

## Cancellation and Rescheduling Policy

Stored and resolved but not wired to appointment workflows (which do not exist yet).

**Semantics:**
```
allowed flag must be true
AND appointment start - now >= notice window (in minutes)
```

Pure helpers exist:
- `canCustomerCancelAppointment(rules, appointmentStartsAt, now)`
- `canCustomerRescheduleAppointment(rules, appointmentStartsAt, now)`

---

## Required Customer Fields

- `require_customer_email` — default: true
- `require_customer_phone` — default: false

These define future booking-form requirements. No public booking form exists yet.

---

## Rule Resolution Utility

`resolveBookingRules({ tenantRules, serviceRules, defaults })`

Pure function. Returns `ResolvedBookingRules` with:
- All resolved numeric/boolean values
- `sources` object tracking where each value came from (`"tenant"` | `"service"` | `"default"`)

---

## Availability Filtering Pipeline

```
1. Validate tenant, service, location, resource
2. Resolve operational periods (location hours, resource hours)
3. Generate candidate slots
4. Resolve booking rules
5. Filter slots by:
   - Past time (slot starts before now)
   - Same-day policy
   - Minimum notice
   - Maximum advance
6. Return permitted candidate slots with metadata
```

---

## Tenant-Local Date Behavior

All date comparisons use the tenant's IANA timezone:
- Same-day determination
- Maximum advance calculation
- Past-date checks

The `getTenantLocalDate(now, timeZone)` utility converts a UTC instant to the tenant's local date.

---

## Strict DST Conversion

`localDateTimeToInstantStrict(localDate, localTime, timeZone)`:

1. Accepts local date, time, and IANA timezone
2. Converts to UTC instant
3. Round-trips instant back to timezone
4. Verifies local date/time match input
5. Returns error for nonexistent times (spring-forward)

**DST Policy:**
- Spring-forward (nonexistent): Error result, caller must skip
- Fall-back (ambiguous): Earlier occurrence selected (deterministic)

---

## RLS and Tenant Protection

Both tables have RLS enabled:
- **SELECT**: Active tenant members
- **INSERT/UPDATE/DELETE**: Owner or admin role

Additional protections:
- Trigger `verify_service_booking_rule_tenant()` ensures service belongs to tenant (enforced even when RLS bypassed)
- Service insert RLS policy also validates service-tenant relationship
- Server actions verify tenant membership and ownership before mutations
- No cross-tenant data exposure

---

## Management UI

### Tenant Settings
Route: `/{tenantSlug}/settings/booking`

Sections: Scheduling Rules, Cancellation Rules, Rescheduling Rules, Customer Requirements.
Notice inputs disabled when parent toggle is off.

### Service Overrides
Route: `/{tenantSlug}/services/{serviceId}/booking-rules`

Tri-state controls for each field: Use tenant default / Override value.
Displays resolved tenant default for context.
"Reset All to Tenant Defaults" deletes the override row.

### Availability Preview
Shows: effective interval + source, minimum notice, maximum advance, same-day policy, count of slots removed by booking rules.

---

## Deferred Functionality

The following are stored/resolved but NOT implemented as workflows:
- Appointment creation/cancellation/rescheduling
- Customer booking forms
- Public booking APIs
- Payment/deposits
- Notifications
- Calendar sync
- Concurrency-safe slot claiming

---

## Database Tables

### `tenant_booking_rules`
- One row per tenant (UNIQUE on tenant_id)
- All policy fields NOT NULL with defaults
- CHECK constraints on all numeric ranges
- FK to tenants with ON DELETE CASCADE

### `service_booking_rules`
- One row per tenant+service (UNIQUE on tenant_id, service_id)
- All policy fields nullable (null = inherit)
- CHECK constraints allow null OR enforce range
- FK to tenants and services with ON DELETE CASCADE
- Tenant-consistency trigger prevents cross-tenant service rules

---

## Manual Verification Steps

```bash
# 1. Apply migration
supabase db push
# or: apply supabase/migrations/20250805000014_booking_rules.sql

# 2. Regenerate database types
npm run db:types

# 3. Remove temporary type assertions (if any)

# 4. Verify
npm run lint
npm run type-check
npm run test
npm run build
```

---

## Assumptions

1. Tenant timezone is always a valid IANA timezone identifier
2. The availability engine is called with a valid service that belongs to the requesting tenant
3. Booking rules are management-only; no unauthenticated endpoint exposes them
4. The `update_updated_at_column()` function already exists from earlier migrations
5. Older tenants without booking-rule rows gracefully fall back to application defaults
6. Service overrides are fully optional — services work without them
7. The slot interval from booking rules is the authoritative source unless an explicit preview override is provided
