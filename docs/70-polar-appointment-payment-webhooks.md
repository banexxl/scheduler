# Polar Appointment Payment Webhooks

Milestone 11.3 — Completed August 2026.

---

## 1. Authority Rule

**`order.paid` is the sole authoritative payment-success event.**

No other event (order.created, checkout.updated, return URL) may cause `amount_paid` to increase or `paid_at` to be set.

---

## 2. Event Routing

Events are routed based on metadata:

```
if metadata.payment_intent_id exists → appointment payment handler
otherwise → existing SaaS billing handler
```

This ensures complete separation between:
- Customer appointment payments (`appointment_payments` + `payment_intents`)
- SaaS tenant billing (`billing_orders` + `tenant_subscriptions`)

---

## 3. Events Handled

| Event | Handler | Effect |
|-------|---------|--------|
| `order.paid` | `handleOrderPaid` | Mark intent succeeded, set amount_paid, paid_at |
| `order.created` | `handleOrderProjection` | Persist provider_order_id (no financial change) |
| `order.updated` | `handleOrderProjection` | Persist provider_order_id (no financial change) |
| `checkout.updated` | `handleCheckoutUpdated` | Update intent to processing if applicable |
| `checkout.expired` | `handleCheckoutExpired` | Mark intent expired, revert payment to unpaid |
| `order.refunded` | (logged only) | Persisted for future 11.5 |
| `refund.*` | (logged only) | Persisted for future 11.5 |

---

## 4. Transactional RPC: `apply_appointment_payment_order_paid`

```sql
1. Lock payment_intent (FOR UPDATE)
2. Check if already succeeded → return already_applied (idempotent)
3. Verify amount matches (if provided)
4. Verify currency matches (if provided)
5. Lock appointment_payment (FOR UPDATE)
6. Verify tenant consistency
7. Mark intent succeeded + completed_at
8. Set amount_paid = intent.amount (SET, not INCREMENT)
9. Set status = paid if amount_paid >= amount_total
10. Set paid_at = NOW() if first time paid
11. Return result
```

---

## 5. Idempotency

- RPC checks `intent.status = succeeded` before any mutation
- `amount_paid` is SET (not incremented) — replaying cannot double
- `paid_at` only set if currently NULL — preserves original timestamp
- Provider order/payment IDs use COALESCE (don't overwrite)

---

## 6. Amount/Currency Verification

Before applying payment:
- If provider reports amount: must match `payment_intent.amount`
- If provider reports currency: must match `payment_intent.currency` (case-insensitive)
- Mismatch → event rejected, logged, no financial mutation

---

## 7. Checkout Correlation

If `order.checkout_id` is available:
- Compare against `payment_intent.provider_checkout_id`
- Mismatch → reject (possible cross-event confusion)

---

## 8. Out-of-Order Safety

| Sequence | Behavior |
|----------|----------|
| order.paid → checkout.expired | Expiry ignored (intent already terminal) |
| order.paid → order.created | Projection ignored (intent not in open/creating) |
| order.paid → checkout.updated | Update ignored (intent not in open/creating) |
| checkout.expired → order.paid | Paid wins (RPC applies regardless of expired state) |

Once `succeeded`, no event can revert the intent.

---

## 9. Checkout Expiry

When `checkout.expired` arrives:
1. RPC `expire_appointment_payment_intent` called
2. If intent already terminal → ignored
3. Otherwise: intent → expired
4. If no other active intents: payment → unpaid

---

## 10. Migration: `20260807000004`

Two SECURITY DEFINER RPCs:
- `apply_appointment_payment_order_paid` — transactional payment confirmation
- `expire_appointment_payment_intent` — safe checkout expiry

Both use `FOR UPDATE` row locking for concurrency safety.

---

## 11. SaaS Billing Regression

- Appointment events are intercepted BEFORE the SaaS billing switch statement
- If `isAppointmentPaymentEvent()` returns true → handled, never reaches SaaS handlers
- If false → normal SaaS billing processing continues unchanged
- Existing SaaS tests must continue passing

---

## 12. Structured Logging

Logged events:
- `appointment_payment_confirmed` — successful payment
- `appointment_payment_duplicate_ignored` — idempotent replay
- `appointment_payment_order_paid_rejected` — mismatch/failure
- `appointment_payment_checkout_mismatch` — correlation failure
- `appointment_payment_intent_expired` — checkout expired
- `appointment_payment_refund_event_received` — future refund event

Never logged: webhook secrets, full payloads, customer PII.

---

## 13. Test Coverage: 38 tests

- Event routing (5)
- order.paid authority (4)
- Duplicate prevention (2)
- Amount verification (2)
- Currency verification (2)
- Checkout expiry (3)
- Out-of-order events (3)
- SaaS billing separation (3)
- Intent transitions (4)
- Correlation verification (2)
- Additional contract tests (8)
