# Polar Appointment Checkout

Milestone 11.2 — Completed August 2026.

---

## 1. Architecture

```
Appointment
  ↓
appointment_payments (11.1)
  ↓
payment_intents (11.1)
  ↓
PolarAppointmentPaymentProvider (11.2)
  ↓
Polar /v1/checkouts/custom API
  ↓
checkout URL → customer redirect
  ↓
Return route (read-only, no mutation)
  ↓
[Future: Webhook confirmation (11.3)]
```

---

## 2. Polar SDK/API

- **API:** REST-based, custom `polarFetch` wrapper (no official SDK dependency)
- **Endpoint:** `POST /v1/checkouts/custom`
- **Auth:** Bearer token (`POLAR_ACCESS_TOKEN`)
- **Base URL:** Configurable via `POLAR_API_BASE_URL` (default: `https://api.polar.sh`)

---

## 3. Product/Price Strategy

Uses Polar's custom checkout endpoint which accepts:
- `amount` (minor units)
- `currency`
- No predefined product/price required for custom amounts

This avoids creating thousands of Polar products for individual appointments.

---

## 4. Checkout Flow

1. Server action receives `tenantSlug` + `appointmentId` (no amount from client)
2. Loads `appointment_payments` record
3. Validates: requirement=full, status eligible, not already paid
4. Calculates `amountToPay = amount_total - amount_paid`
5. Checks for reusable open intent (same amount/currency)
6. Creates local `payment_intents` row (status=creating)
7. Calls Polar API
8. On success: updates intent to `open`, persists `provider_checkout_id` + `checkout_url`
9. Updates `appointment_payments.status = pending`
10. Returns `checkoutUrl` to client

---

## 5. Amount Authority

- Amount comes exclusively from `appointment_payments.amount_total`
- Client action input contains ONLY identifiers (tenantSlug, appointmentId)
- No client-supplied amount/currency is ever trusted
- `amount_paid` remains 0 until webhook confirmation (11.3)
- `paid_at` remains null until webhook confirmation

---

## 6. Return Route

**Path:** `/book/{tenantSlug}/payment/return?ref={intentId}`

**Behavior:**
- Read-only: looks up current intent status
- Shows "Payment submitted — confirming..." by default
- Shows "Payment confirmed" only if intent status = `succeeded` (set by webhook)
- **NEVER mutates** payment state from URL visit

This prevents the attack: visiting return URL manually → marking payment as paid.

---

## 7. Intent Transitions (11.2 only)

```
creating → open     (Polar checkout created successfully)
creating → failed   (Polar API error)
```

NOT in this milestone:
```
open → succeeded    (webhook, 11.3)
open → expired      (webhook/cron, later)
```

---

## 8. Idempotency & Reuse

- Each intent has unique `request_key` (tenant-scoped)
- Before creating new checkout: check for existing `open` intent with matching amount/currency
- If reusable: return existing `checkout_url` (no duplicate Polar call)
- If amount/currency changed: old intent would need cancellation first

---

## 9. Authorization

Checkout creation requires:
- Authenticated user (`requireUser`)
- Either: active customer-account link to the tenant
- Or: active tenant membership (business user)

Prevents: arbitrary UUID → checkout creation

---

## 10. Metadata to Polar

Sent:
- `payment_intent_id`
- `appointment_id`
- `tenant_id`

NOT sent:
- Customer email (separate field)
- Phone, notes, internal data
- Secrets, tokens

---

## 11. Failure Handling

On Polar API failure:
- Local intent marked `failed`
- `failure_code` + truncated `failure_message` stored
- Safe error returned to customer
- Structured logger captures diagnostics

---

## 12. SaaS Billing Separation

Appointment payments use:
- `appointment_payments` + `payment_intents`

SaaS tenant billing uses:
- `billing_checkout_sessions` + `billing_orders` + `tenant_subscriptions`

Completely separate domains. Shared: Polar client, config, webhook infra.

---

## 13. Deferred to Future Milestones

| Feature | Milestone |
|---------|-----------|
| Webhook payment confirmation | 11.3 |
| Deposits (partial payment) | 11.4 |
| Refunds | 11.5 |
| Tenant product management | Later |
| Package purchases | Later |

---

## 14. Test Coverage

35 tests covering:
- Provider adapter contract
- Checkout eligibility (5 appointment statuses)
- Amount authority (server-only, no client amount)
- Payment requirement validation
- Return route safety (never marks paid)
- Metadata privacy
- Intent transitions
- Concurrency/reuse
- Success URL generation
