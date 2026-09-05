# Appointment Payment Requirements

Milestone 11.4 — Completed August 2026.

---

## 1. Payment Requirement Model

| Requirement | Meaning |
|------------|---------|
| `none` | No online payment needed (pay at business) |
| `full` | Complete amount must be paid online before deadline |

`deposit` exists in schema preparation but is not enabled.

---

## 2. Precedence

```
service_payment_rules.payment_requirement (if non-null)
  ?? tenant_appointment_payment_settings.default_payment_requirement
  ?? application default ('none')
```

Additional overrides:
- Price = 0 → always 'none'
- Provider unavailable → always 'none'
- Online payments disabled → always 'none'

---

## 3. Payment Deadline

- Range: 5–60 minutes
- Default: 15 minutes
- Stored as `payment_due_at` (timestamptz) on `appointment_payments`
- Calculated: `appointment_creation_time + deadline_minutes`
- Immutable: retry does NOT extend deadline
- Approximate: actual release depends on processor cadence (~1 min)

---

## 4. Expiry Processor

**Route:** `POST /api/internal/appointment-payments/process-expired`
**Auth:** Bearer NOTIFICATION_PROCESSOR_SECRET
**Schedule:** Every 1 minute

**Flow:**
1. `claim_expired_appointment_payments` (FOR UPDATE SKIP LOCKED, batch 50)
2. For each: `cancel_expired_appointment_payment` RPC
3. RPC re-checks paid status under lock (race protection)
4. If still unpaid: cancel appointment, mark payment expired
5. Non-blocking: trigger waitlist matching, cancel reminders

---

## 5. Webhook/Timeout Race

**Critical guarantee:** The `cancel_expired_appointment_payment` RPC:
1. Locks both `appointment_payments` and `appointments` rows
2. Re-checks `status = 'paid'` and `amount_paid >= amount_total`
3. If payment arrived between claim and cancel: returns `already_paid`
4. Appointment is NOT cancelled if payment succeeded

This prevents the race where `order.paid` and expiry processor run simultaneously.

---

## 6. Late Payment

If `order.paid` arrives after appointment was already released:
- Payment is recorded (intent → succeeded)
- `requires_review = true` set on payment record
- Appointment is NOT reactivated (slot may belong to someone else)
- Flagged for financial review/refund (11.5)

---

## 7. Settings UI

**Route:** `/{tenantSlug}/settings/payments`
**Access:** Owner/Admin only

Controls:
- Enable/disable online payments
- Default requirement (none / full)
- Payment deadline (5–60 minutes)
- Allow pay-at-business option

---

## 8. Service Override

- Per-service payment rule overrides tenant default
- NULL = inherit from tenant
- Service override available via service settings

---

## 9. Existing Tenant Safety

Migration defaults:
```
online_payments_enabled = false
```

No existing booking behavior changes until tenant explicitly enables payments.

---

## 10. Test Coverage: 20 tests

- Tenant disabled (1)
- Tenant full requirement (1)
- Tenant none requirement (1)
- Service override full → none (1)
- Service override none → full (1)
- Service null inheritance (1)
- Zero-price (2)
- Provider unavailable (1)
- Null tenant settings (1)
- Deadline resolution (3)
- Deadline immutability contract (1)
- Late payment contract (1)
- Race protection contract (1)
- Additional (4)
