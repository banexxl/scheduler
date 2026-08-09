# Polar Appointment Refunds

Milestone 11.5 — Completed August 2026.

---

## 1. Refund Model

| Field | Purpose |
|-------|---------|
| `amount` | Minor units, must be > 0 |
| `currency` | Must match original payment |
| `status` | creating → pending → succeeded/failed |
| `origin` | platform (our UI) or provider (Polar dashboard) |
| `reason_code` | customer_request, appointment_cancelled, late_payment, etc. |
| `provider_refund_id` | Unique, partial index |

---

## 2. Refundable Amount

```
refundable = amount_paid - amount_refunded - pending_refund_amounts
```

Pending refunds reserve capacity to prevent over-refunding.

---

## 3. Flow (Platform-Initiated)

```
Owner/admin action
  → validate amount ≤ refundable
  → create local refund (status=creating)
  → call Polar /v1/refunds
  → update status=pending, store provider_refund_id
  → await webhook confirmation
  → apply_appointment_refund_succeeded RPC
  → amount_refunded += refund.amount
  → payment status recalculated
```

---

## 4. Flow (Provider-Initiated)

```
Polar dashboard refund
  → refund.created/refund.updated webhook
  → correlate via provider_order_id
  → create local refund (origin=provider)
  → apply_appointment_refund_succeeded
  → UI reflects immediately
```

---

## 5. Payment Status After Refund

| State | Condition |
|-------|-----------|
| `partially_refunded` | 0 < amount_refunded < amount_paid |
| `refunded` | amount_refunded ≥ amount_paid |

---

## 6. Concurrency Safety

- `apply_appointment_refund_succeeded` uses FOR UPDATE on both refund and payment
- Calculates `new_refunded = current + refund.amount`
- Rejects if `new_refunded > amount_paid` (over-refund protection)
- Idempotent: returns `already_applied` if refund already succeeded

---

## 7. Late Payment Resolution

When payment requires review (received after appointment released):
- Owner/admin can issue refund
- After successful refund: `requires_review` can be cleared
- Appointment stays cancelled (never reactivated)

---

## 8. Authorization

- Only owner/admin may create refunds
- Manager/staff may view refund status
- Customer sees safe summary (amount refunded, not internal details)

---

## 9. Test Coverage: 30 tests

- Constants (3), refundable calculation (6), status transitions (3)
- Duplicate safety (2), concurrent protection (1), provider-initiated (2)
- Late payment resolution (1), appointment status unchanged (2)
- Authorization (2), SaaS separation (2), additional contracts (6)
