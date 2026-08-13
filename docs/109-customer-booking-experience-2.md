# Customer Booking Experience 2.0

> Milestone 15.12 — Integration + UX milestone. Single canonical booking engine preserved.

## Architecture

No second booking engine, availability engine, payment lifecycle, gift-card ledger, package ledger, or recurrence engine introduced. All new code calls existing authoritative services.

### Step Flow

```
Service → Location → Date & Time → Recurrence (optional) → Customer Details → Payment (conditional) → Review → Confirmation
```

### Key Files

| Area | File |
|------|------|
| Flow | `features/public-booking/components/public-booking-flow.tsx` |
| Booking action | `features/public-booking/actions/create-public-booking-action.ts` |
| Series action | `features/public-booking/actions/create-public-series-action.ts` |
| Gift card validation | `features/public-booking/actions/validate-gift-card-action.ts` |
| Gift card service | `features/gift-cards/services/gift-card-redemption-service.ts` |
| Package eligibility | `features/public-booking/actions/get-eligible-packages-action.ts` |
| Payment step | `features/public-booking/components/public-payment-step.tsx` |
| Recurrence step | `features/public-booking/components/public-recurrence-step.tsx` |
| Confirmation | `features/public-booking/components/public-booking-confirmation.tsx` |
| ICS export | `features/public-booking/utils/generate-ics.ts` |

## Gift Cards

- SHA-256 hash lookup, raw code never stored/logged
- Reservation with 15-min expiry, confirmed on booking success, released on failure
- Tenant-scoped (cross-tenant = generic "invalid")
- Partial value supported (remainder = pay at business)
- Concurrency safe via reservation deduction from available balance

## Packages

- Server-authoritative balance via `getEligiblePackagesForBooking`
- Customer identity from portal session cookie (never browser-provided)
- Reserve via RPC after appointment creation succeeds
- Row-level locking prevents double-spend

## Recurring

- Reuses `generateRecurringOccurrences` + `formatRecurrenceSummary`
- All-or-nothing creation (conflict on any date rejects series)
- Pay-at-business only (online/package/gift-card disabled per 15.1 policies)
- Idempotency key prevents duplicate series

## Confirmation + ICS

- Enhanced display: payment method, gift card details, recurrence summary
- RFC 5545 ICS download with proper escaping and UTC datetimes
- No internal notes/IDs exposed in calendar export

## Security

- Tenant isolation (all queries scoped), RLS intact
- Customer identity from server session only
- Financial authority: webhook-only payment confirmation
- No service-role keys/JWTs in browser
- Idempotency server-side (not just disabled buttons)
