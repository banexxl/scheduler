# Staff Availability, Time Off & Operational Schedule Management

Milestone 12.3 — Completed August 2026.

---

## 1. Scheduling Authority

| Concept | Source of Truth |
|---------|----------------|
| Recurring weekly schedule | `resource_working_hours` |
| Temporary unavailability | `resource_time_off` |
| Location hours | `location_business_hours` |
| Service eligibility | `service_resources` |
| Occupied time | `appointments` |
| Staff identity | `staff_profiles` (presentation only) |
| Authorization | `tenant_members` |

No duplicate schedule tables introduced.

---

## 2. Effective Availability

```
location_business_hours
∩ resource_working_hours
∩ service_resources eligibility
- location_schedule_exceptions
- resource_time_off
- existing appointments
= available booking slots
```

---

## 3. Schedule Conflict Detection

Before saving schedule changes:
- Count future non-cancelled appointments that would fall outside new hours
- Return bounded preview (max 5 appointments)
- Saving despite conflict preserves existing appointments (explicit confirm required)

---

## 4. Time-Off Behavior

- Blocks new availability (no new bookings)
- Does NOT cancel existing appointments (warning shown)
- Private reason never exposed publicly
- Deleting time off immediately restores potential availability

---

## 5. Own-Schedule Access

Server resolves: `auth.uid() → tenant_member → staff_profile → resource_id`

Staff cannot:
- Claim another resource as their own
- Edit their own recurring schedule (management-controlled)
- View other staff's private configuration

---

## 6. Role Matrix

| Action | Owner | Admin | Manager | Staff |
|--------|:-----:|:-----:|:-------:|:-----:|
| View all schedules | ✓ | ✓ | ✓ | — |
| Edit any schedule | ✓ | ✓ | — | — |
| Manage time off | ✓ | ✓ | — | — |
| View own schedule | ✓ | ✓ | ✓ | ✓ |
| Edit own recurring | — | — | — | — |

---

## 7. Infrastructure Reused (No Duplication)

- `resource_working_hours` — existing table, RPC, actions, form
- `resource_time_off` — existing table, RPC, actions, form
- `staff_profiles` — from 12.2
- Availability engine — unchanged
- Calendar resource filters — unchanged
- Appointment queries — unchanged

---

## 8. Test Coverage: 25 tests

- Scheduling authority (3), effective availability (4)
- Conflict detection (3), time off (3)
- Own schedule (3), authorization (3)
- Separation (3), query bounds (3)
- Public privacy (3), non-human resources (1)
