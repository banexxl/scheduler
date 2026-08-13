# Runtime Wiring Closure — Milestone 15.5.1

## Runtime Call Sites Changed

| File | Change |
|---|---|
| `features/appointments/components/appointment-create-form.tsx` | Added RecurrenceEditor, series creation routing, conflict display |
| `features/appointments/actions/update-status-action.ts` | Added `attemptReferralQualification` call after completion |
| `features/gift-cards/actions/create-gift-card-purchase-action.ts` | Local purchase creation with pending status |
| `features/platform/services/process-billing-webhooks.ts` | Added gift card event routing in dispatcher |
| `features/gift-cards/services/process-gift-card-webhook.ts` | Created — handles order.paid → fulfillment RPC |

---

## Recurring Appointments

- **RecurrenceEditor** imported and rendered in the real `AppointmentCreateForm` confirm step
- **Repeat OFF**: continues to use `createAppointmentAction` (unchanged)
- **Repeat ON**: routes to `createAppointmentSeriesAction`
- **Preview**: shows recurrence summary + occurrence count before submission
- **Conflicts**: displayed from action response with unavailable dates listed
- **Edit scope**: `EditScopeDialog` component exists — wiring into edit flow deferred (no series split backend exists)
- **"This and future"**: NOT exposed (backend split not fully implemented)
- **Cancel scope**: cancel action supports one/future via existing `cancelSeriesOccurrencesAction`

---

## Referral Qualification

- **Canonical completion**: `updateAppointmentStatusAction` in `features/appointments/actions/update-status-action.ts`
- **Qualification call**: `attemptReferralQualification(tenant.id, appointmentId, customerEmail)` after status = "completed"
- **Non-blocking**: wrapped in try/catch, failure logged but never reverses completion
- **Idempotent**: uses `eq("status", "attributed")` optimistic lock — won't double-qualify
- **Recovery**: remains in "qualified" status until reward issued
- **Recurring**: one customer acquisition per tenant (UNIQUE constraint)

---

## Gift Card Checkout

- **Local purchase**: created in `gift_card_purchases` with server-authoritative amount/currency
- **Polar integration**: pending status set, checkout URL to be created at runtime with Polar client
- **Return URL**: cannot fulfill gift card (display only)
- **Code security**: raw code generated only at fulfillment time, never stored

---

## Gift Card Webhook

- **Dispatcher**: `process-billing-webhooks.ts` — added `isGiftCardPurchaseEvent` check before SaaS billing routing
- **Event type**: `order.paid` only triggers fulfillment
- **Metadata routing**: checks `metadata.domain === "gift_card_purchase"` or `metadata.gift_card_purchase_id`
- **Fulfillment**: calls `fulfill_gift_card_purchase` RPC (atomic, idempotent)
- **Duplicate**: RPC returns `already_fulfilled` — no double issuance
- **Amount mismatch**: prevents fulfillment, logs warning
- **Delivery**: raw code available only within fulfillment boundary for notification delivery

---

## Explicit Confirmations

- RecurrenceEditor is imported and rendered by real appointment creation UI
- Repeat OFF still creates one normal appointment
- Repeat ON creates a real appointment series
- Conflict prevents partial creation (action returns conflicts array)
- "This and future" is NOT exposed (backend incomplete)
- Appointment completion actually invokes referral qualification
- Referral processing cannot fail appointment completion
- Referral qualification is exactly-once (optimistic lock)
- Failed reward can be retried (stays "qualified")
- Recurring appointments cannot duplicate acquisition rewards (DB unique constraint)
- Gift card webhook routes through canonical dispatcher
- Amount mismatch prevents fulfillment
- Duplicate webhooks cannot issue two gift cards
- Raw codes never stored or logged
- Gift card events cannot mutate appointment/package/SaaS payments
- Normal tenant actions use authenticated clients
- Webhook verification remains intact (signature checked before dispatch)
- No RLS recursion introduced
- `page.tsx` files remain Server Components
- Client components receive serializable data only
- No live Polar calls in tests
- No new product domain introduced
