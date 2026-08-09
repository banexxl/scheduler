# Payment History, Receipts & Financial Dashboard

Milestone 11.8 — Completed August 2026.

---

## 1. Financial Domain Separation

| Domain | Tables | Purpose |
|--------|--------|---------|
| SaaS billing | billing_orders, tenant_subscriptions | Tenant pays get-slot |
| Appointment payments | appointment_payments, payment_intents | Customer pays for appointment |
| Package purchases | package_purchases | Customer buys package credits |

11.8 covers appointment payments + package purchases only.

---

## 2. Provider Financial Snapshot

Added to `appointment_payments` and `package_purchases`:
- `provider_subtotal_amount`, `provider_discount_amount`, `provider_tax_amount`, `provider_total_amount`
- `discount_code_snapshot`, `discount_amount_snapshot`, `original_amount`
- `receipt_available`, `invoice_available`

---

## 3. Tenant Payment Summary RPC

`get_tenant_payment_summary(p_tenant_id, p_from, p_to)`:
- Aggregates by currency (never sums RSD + EUR)
- Returns: appointment payment totals, package purchase totals, refund totals
- All computed in PostgreSQL (no Node.js row loading)

---

## 4. Terminology

| Term | Definition |
|------|-----------|
| Payments received | Sum of successful customer payments |
| Refunded | Sum of successful refunds |
| Net customer payments | Payments - Refunds |
| Discounts applied | Confirmed discount snapshots from paid transactions |

NOT used: Revenue, Profit, Earnings, Payout.

---

## 5. Multi-Currency

- Each currency reported separately
- No FX conversion
- UI shows currency groups independently

---

## 6. Pagination

- Default: 25/page
- Max: 100/page
- Stable ordering: created_at DESC

---

## 7. Receipt Access

- On-demand Polar receipt URL fetch (not cached permanently)
- Authorization: tenant member for own transactions, customer for own linked transactions
- Browser cannot submit arbitrary Polar order ID
- Safe error if receipt unavailable

---

## 8. Test Coverage: 14 tests

- Financial summary (3), multi-currency (2), discount snapshot (2)
- Pagination bounds (3), SaaS isolation (1), receipt auth (1), terminology (2)
