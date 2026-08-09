# Staff Operational Dashboard — My Day

Milestone 12.4 — Completed August 2026.

---

## 1. Purpose

One-screen operational view for linked staff. Mobile-first.
Shows: working hours, next appointment, today's schedule, gaps, status.

---

## 2. Identity Resolution

```
auth.uid() → tenant_member → staff_profile → resource_id
```

Server resolves. Browser cannot claim another resource.
Unlinked members see safe "not linked" message.

---

## 3. Data Scope

- Today only (tenant timezone)
- Bounded: max 200 appointments/day
- No N+1 (single batch for appointments, hours, time-off)

---

## 4. Gap Calculator

Pure utility: `calculateDayGaps(workingPeriods, blockedRanges)`
- Supports split shifts
- Subtracts appointments + time off
- Minimum 10-minute threshold
- Gaps are informational (not bookable slots)

---

## 5. Quick Actions

Reuses existing appointment status actions.
Preserves: status history, timestamps, review triggers, package usage, loyalty, waitlist.

---

## 6. Privacy

Exposed: customer name, phone, email, appointment notes preview.
NOT exposed: loyalty, packages, CRM internals, cross-tenant data, financial analytics.

---

## 7. Test Coverage: 25 tests

- timeToMinutes/minutesToTime (6)
- Gap calculation (8): empty, single, multiple, split shift, min threshold, adjacent, full block
- Identity resolution (3)
- Appointment authorization (2)
- Customer privacy (2)
- Existing actions reused (2)
- Additional (2)
