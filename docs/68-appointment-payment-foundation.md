# Appointment Payment Foundation

Milestone 11.1 — Completed August 2026.

---

## 1. Architecture

```
Appointment
   ↓
appointment_payments (1:1 per appointment)
   ↓
payment_intents (1:many attempts)
   ↓
[Future: Provider checkout → webhook → confirmation]
```

Separate from SaaS tenant billing (`billing_orders`, `tenant_subscriptions`).

---

## 2. Payment Statuses

| Status | Meaning |
|--------|---------|
| `not_required` | No online payment needed |
| `unpaid` | Payment required but no success |
| `pending` | Active payment attempt in progress |
| `partially_paid` | Partial amount received (deposit future) |
| `paid` | Full amount confirmed |
| `partially_refunded` | Some amount returned |
| `refunded` | Full amount returned |
| `failed` | Payment attempt failed |
| `cancelled` | Payment cancelled |

---

## 3. Payment Intent Statuses

| Status | Meaning |
|--------|---------|
| `creating` | Local record created, no provider call yet |
| `open` | Customer may complete payment |
| `processing` | Provider indicates in-progress |
| `succeeded` | Provider confirmed success |
| `failed` | Attempt failed |
| `expired` | Opportunity expired |
| `cancelled` | Explicitly invalidated |

---

## 4. Payment Requirement

| Requirement | Behavior |
|------------|----------|
| `none` | No payment needed (default) |
| `full` | Full amount before/after booking |
| `deposit` | Partial amount (deferred to 11.4) |

---

## 5. Money Semantics

- All monetary values stored as **integer minor units** (bigint)
- Currency stored as ISO 4217 uppercase 3-letter code
- Currency exponent utility supports 0-decimal (JPY), 2-decimal (EUR/USD), 3-decimal (BHD)
- Never use floating-point for financial storage
- `amount / 100` is incorrect for all currencies — use `getCurrencyExponent()`

---

## 6. Snapshot Policy

- `amount_total` and `currency` are snapshotted from `appointment.price` at payment creation time
- Changing service price later does NOT retroactively change existing payment amounts
- If appointment is repriced before payment: unpaid summary can be refreshed
- If successful payment exists: requires explicit reconciliation (not auto-overwrite)

---

## 7. Idempotency

- `payment_intents.request_key` is unique per tenant
- Format: `appointment:{id}:payment:{uuid}`
- Prevents duplicate intent creation from retries/double-submit
- Server generates the key (not client-supplied)

---

## 8. Reusable Intent

Before creating new intent:
- Check for existing `creating` or `open` intent with matching amount/currency
- If found: return existing (no duplicate)
- If amount/currency mismatch: old intent should be cancelled first

---

## 9. Tenant Isolation

- Both tables include `tenant_id` with FK to tenants
- Relationship trigger verifies:
  - `appointment_payments.appointment_id` belongs to same `tenant_id`
  - `payment_intents.appointment_payment_id` belongs to same `tenant_id` + `appointment_id`
- RLS: SELECT for active tenant members only
- No direct client writes (mutations via trusted server services)

---

## 10. Customer Privacy

Customer DTO exposes only:
- status, amountTotal, amountPaid, amountRefunded, currency, paymentRequired

Never exposed:
- provider IDs, request keys, metadata, failure internals, checkout URLs

---

## 11. Provider Neutrality

- Provider field: `polar | manual | external`
- No Polar-specific column names in core model
- `provider_checkout_id`, `provider_order_id`, `provider_payment_id` are generic
- Partial unique indexes on provider IDs (non-null only)

---

## 12. Existing Appointment Compatibility

- No mandatory backfill — payment row created on-demand
- Appointments without payment row treated as `not_required`
- No runtime errors for old appointments
- No payment action exposed to users until provider integration (11.2)

---

## 13. Cancellation

- Cancelling appointment does NOT delete payment/intent records
- History preserved for diagnostics
- Open/creating intents may be marked cancelled
- Financial records are never physically deleted

---

## 14. Future Roadmap

| Milestone | Feature |
|-----------|---------|
| 11.1 | Local payment model (this) |
| 11.2 | Provider checkout integration |
| 11.3 | Webhook confirmation |
| 11.4 | Deposits |
| 11.5 | Refunds |

---

## 15. Database Objects

### Tables
- `appointment_payments` — one per appointment, payment summary
- `payment_intents` — individual payment attempts

### Constraints
- Unique: `(tenant_id, appointment_id)` on payments
- Unique: `(tenant_id, request_key)` on intents
- Check: currency format, amount bounds, status enums, paid_at/completed_at requirements

### Indexes
- `idx_ap_tenant_appointment`, `idx_ap_tenant_status`
- `idx_pi_tenant_appointment`, `idx_pi_payment_id`, `idx_pi_tenant_status`
- Partial unique: `provider_checkout_id`, `provider_order_id`

### Triggers
- `verify_appointment_payment_relationships` — tenant consistency
- `update_updated_at_column` — auto-timestamps

### RLS
- SELECT: tenant members
- INSERT/UPDATE/DELETE: server-only (no client policies)

---

## 16. Test Coverage

42 tests covering:
- Status resolution (14 cases)
- Currency exponent (6 currencies)
- Minor-unit conversion (5 cases)
- Display formatting (4 cases)
- Currency validation (5 cases)
- Constants verification (4 cases)
