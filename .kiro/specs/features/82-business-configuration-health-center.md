# Business Configuration Health Center

Milestone 12.6 — Completed August 2026.

---

## 1. Purpose

Answers: "Is this business ready to accept bookings?"
NOT onboarding. NOT operational inbox. NOT monitoring.

---

## 2. Architecture

```
page.tsx → batched config queries (parallel)
  → evaluateBusinessHealth(inputs) [pure function]
  → BusinessHealthSummary DTO
  → client-page.tsx renders checks
```

Read-only. No mutations on render.

---

## 3. Health Statuses

| Status | Meaning |
|--------|---------|
| `ready` | Configuration valid |
| `needs_attention` | Works but incomplete/risky |
| `blocked` | Critical requirement missing |
| `optional` | Enhancement, not required |

---

## 4. Overall Status Rule

- Any `blocked` → overall `blocked`
- Any `needs_attention` (no blocked) → overall `needs_attention`
- Otherwise → `ready`
- `optional` checks never affect overall

---

## 5. Checks Implemented

| Key | Category | Blocked When |
|-----|----------|-------------|
| business.timezone | business | No valid timezone |
| locations.active | locations | No active locations |
| locations.hours | locations | — (attention only) |
| services.active | services | No active services |
| services.locations | services | Services without location assignment |
| services.resources | services | Services without resource assignment |
| resources.working_hours | scheduling | No resources have schedules |
| booking.public | booking | — (optional) |
| booking.future_availability | booking | — (attention only) |
| communications.provider | communications | Email enabled but not configured |
| payments.provider | payments | Payments enabled but provider unavailable |
| team.owner | operations | No active owner |

---

## 6. Test Coverage: 20 tests

- Overall status (4), timezone (2), locations (2)
- Services (3), scheduling (2), public booking (2)
- Communications (2), payments (2), operations (2)
- Read-only behavior (1)
