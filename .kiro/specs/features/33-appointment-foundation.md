# 33 — Appointment Foundation and Conflict Protection (Milestone 6.9)

## Overview

This milestone implements persistent appointments for internal tenant users, including the data model, conflict protection, availability integration, and management UI.

A candidate slot from Milestone 6.7/6.8 can now be converted into a persistent appointment through a controlled creation workflow that revalidates all inputs before insert.

---

## Appointment Table

`public.appointments` — stores all appointment records with:

- Identity: `id`, `tenant_id`, `appointment_number`
- Relationships: `service_id`, `location_id`, `resource_id`, `customer_id`
- Customer: `customer_name`, `customer_email`, `customer_phone`
- Status: `status`, `source`
- Timing: `starts_at`, `ends_at`, `occupied_starts_at`, `occupied_ends_at`
- Snapshots: `duration_minutes`, `buffer_before_minutes`, `buffer_after_minutes`, `price`, `currency`
- Historical: `service_name_snapshot`, `location_name_snapshot`, `resource_name_snapshot`
- Notes: `internal_notes`, `customer_notes`
- Cancellation: `cancelled_at`, `cancelled_by`, `cancellation_reason`
- Audit: `created_by`, `updated_by`, `created_at`, `updated_at`

---

## Snapshot Strategy

Appointments preserve effective values at booking time:
- Service name, location name, resource name (text snapshots)
- Duration, buffers, price, currency (numeric snapshots)

Foreign keys remain for navigation. Snapshots preserve historical truth when entities are renamed or repriced.

---

## Appointment Number

Format: `APT-YYYY-NNNNNN` (e.g., `APT-2026-000001`)

Generation:
- `appointment_sequences` table with tenant-scoped atomic counter
- `generate_appointment_number()` function uses INSERT ON CONFLICT DO UPDATE for concurrency safety
- Unique within tenant: `UNIQUE (tenant_id, appointment_number)`
- Immutable after creation, not derived from row count

---

## Status Model

```
pending → confirmed → checked_in → in_progress → completed
    ↓         ↓            ↓              ↓
cancelled  cancelled    cancelled      cancelled
              ↓            ↓
           no_show      no_show
```

Terminal statuses: `completed`, `cancelled`, `no_show`

Transitions enforced by database trigger `verify_appointment_status_transition` and TypeScript utility `canTransitionAppointmentStatus`.

---

## Blocking Status Semantics

**Cancelled is the only non-blocking status.**

All other statuses (pending, confirmed, checked_in, in_progress, completed, no_show) block the occupied interval for conflict purposes.

This preserves historical consistency and prevents accidental double-booking.

---

## Conflict Interval Semantics

Two appointments conflict when their occupied intervals overlap (half-open):

```
existing.occupied_starts_at < new.occupied_ends_at
AND existing.occupied_ends_at > new.occupied_starts_at
```

Adjacent appointments are valid: `[09:00, 10:00)` and `[10:00, 11:00)` do not conflict.

---

## Database Exclusion Protection

```sql
EXCLUDE USING gist (
  tenant_id WITH =,
  resource_id WITH =,
  tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&
)
WHERE (status <> 'cancelled')
```

Uses `btree_gist` extension. Provides concurrency-safe conflict protection — no advisory locks or application-level select-then-insert patterns needed.

---

## Concurrency Guarantees

- Exclusion constraint handles concurrent double-booking atomically
- Appointment number generation uses INSERT ON CONFLICT for atomic increment
- No serializable transaction wraps TypeScript availability check + DB insert
- Stale-state risk mitigated by: DB triggers revalidate relationships and active states; exclusion constraint prevents conflicts regardless of TypeScript state

---

## Tenant Validation

Trigger `verify_appointment_relationships` validates on INSERT and relevant UPDATEs:
- Service belongs to tenant
- Location belongs to tenant
- Resource belongs to tenant
- Service-location assignment is active
- Service-resource assignment is active
- Resource-location assignment is active

Status-only updates skip this validation (allows historical records when entities become inactive).

---

## Creation and Revalidation Flow

1. Authenticate caller, verify owner/admin role
2. Validate input via yup schema
3. Load tenant timezone
4. Strict DST conversion (`localDateTimeToInstantStrict`)
5. Load and verify service, location, resource entities
6. Verify all three assignment relationships are active
7. Resolve effective service-resource values (duration, buffers, price, currency)
8. Calculate occupied window from resolved values
9. Call `calculateAvailability` to revalidate the exact slot exists
10. Validate booking-rule required customer fields
11. Build snapshot values from current entity names
12. Call `insert_appointment_atomic` RPC
13. Database enforces: interval consistency, relationship validation, conflict exclusion
14. Return created appointment or conflict/validation error

---

## Availability Integration

Pipeline (updated from Milestone 6.7):

```
location hours ∩ resource hours − resource time off − blocking appointments → slot generation → booking rule filtering
```

`loadBlockingAppointments` bulk-loads non-cancelled appointment intervals for all eligible resources in one query. Intervals are subtracted using `subtractInstantRanges`.

New reason code: `FULLY_BLOCKED_BY_APPOINTMENTS`

---

## Cancellation Behavior

- Calls `cancel_appointment` RPC atomically
- Sets: `status = 'cancelled'`, `cancelled_at = now()`, `cancelled_by`, optional reason
- Validates appointment is not already terminal
- Preserves all historical data
- Releases the occupied range (cancelled excluded from exclusion constraint)
- No physical deletion

---

## Rescheduling Behavior

Policy: **Any scheduling change recalculates all service snapshots from current configuration.**

Flow:
1. Load existing appointment
2. Reject if terminal status
3. Resolve new service/location/resource (defaults to existing if not changed)
4. Strict DST conversion for new time
5. Verify all entities and assignments
6. Resolve current effective values
7. Recalculate availability (current appointment still blocks; self-overlap check)
8. Update atomically with refreshed snapshots
9. Exclusion constraint handles concurrent conflicts

---

## Required Customer Fields

Booking-rule `requireCustomerEmail` and `requireCustomerPhone` are enforced during creation. Internal users cannot bypass these requirements unless a dedicated override is introduced later.

---

## Time-Zone Behavior

- All times stored as `timestamptz` (exact instants)
- Display in tenant timezone from `tenants.default_timezone`
- Creation uses `localDateTimeToInstantStrict` with round-trip verification
- DST spring-forward: rejected with error (nonexistent time)
- DST fall-back: earlier occurrence selected (deterministic)
- Browser timezone is never the scheduling authority

---

## RLS Policies

- SELECT: active tenant members
- INSERT: owner/admin
- UPDATE: owner/admin
- DELETE: owner/admin (not exposed in UI)

---

## UI Routes

| Route | Purpose |
|-------|---------|
| `/{tenantSlug}/appointments` | List with filters |
| `/{tenantSlug}/appointments/new` | Multi-step creation |
| `/{tenantSlug}/appointments/{id}` | Detail view |
| `/{tenantSlug}/appointments/{id}/edit` | Edit customer/notes |

---

## Audit Behavior

- `created_by` and `updated_by` populated from authenticated user
- `cancelled_by` set during cancellation
- `updated_at` auto-maintained by trigger
- No full audit history table (deferred)

---

## Performance Indexes

- `(tenant_id, starts_at)` — list queries
- `(tenant_id, resource_id, starts_at)` — resource schedule
- `(tenant_id, resource_id, occupied_starts_at)` — availability subtraction
- `(tenant_id, status, starts_at)` — status filtering
- `(tenant_id, location_id, starts_at)` — location filtering
- `(tenant_id, service_id, starts_at)` — service filtering
- `(tenant_id, customer_id)` — customer lookup
- GiST index backing exclusion constraint

---

## Deferred: Public Booking

Not implemented: public booking pages, customer accounts, guest booking, online payments, deposits, confirmation emails, SMS, reminders.

## Deferred: Holds and Payments

Not implemented: temporary slot holds, slot locking, payment processing, refunds, taxes, coupons.

## Deferred: Advanced Features

Not implemented: recurring appointments, group bookings, capacity > 1, multiple resources per appointment, external calendar sync, automated resource assignment.

---

## Manual Verification Steps

```bash
# 1. Apply migration
# supabase/migrations/20250805000015_appointments.sql

# 2. Regenerate database types
npm run db:types

# 3. Run verification
npm run lint
npm run type-check
npm run test
npm run build
```

---

## Assumptions

- No existing customers table — `customer_id` FK is nullable and not enforced against a table
- The `insert_appointment_atomic` RPC uses SECURITY DEFINER for appointment number generation
- Booking-rule required-field enforcement applies to internal users equally
- Completed/no_show appointments continue to block their historical time ranges
