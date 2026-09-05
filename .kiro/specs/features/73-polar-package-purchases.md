# Polar Package Purchases

Milestone 11.6 — Completed August 2026.

---

## 1. Architecture

```
service_packages (catalog + pricing)
  ↓
package_purchases (purchase record)
  ↓ Polar checkout
customer pays
  ↓ order.paid webhook
purchase → paid → fulfilled
  ↓
customer_packages (credits granted)
```

---

## 2. Dynamic Checkout Strategy

Uses Polar `/v1/checkouts/custom` with:
- Amount from `service_packages.price_amount` (server-authoritative)
- Currency from `service_packages.price_currency`
- No predefined Polar product per package (dynamic pricing)

---

## 3. Purchase Statuses

| Status | Meaning |
|--------|---------|
| `creating` | Local record, no provider call yet |
| `pending` | Polar checkout exists, customer may pay |
| `paid` | order.paid received, fulfillment pending |
| `fulfilled` | customer_package created |
| `failed` | Provider error |
| `expired` | Checkout expired |
| `refunded` | Future refund |
| `cancelled` | Explicitly cancelled |
| `requires_review` | Amount/currency mismatch |

---

## 4. Fulfillment RPC

`fulfill_package_purchase()`:
1. Lock purchase row
2. Check already fulfilled (idempotent)
3. Verify amount/currency
4. Create `customer_packages` row with snapshotted credits/expiry
5. Mark purchase `fulfilled` + set `customer_package_id`

Concurrent workers produce exactly one `customer_packages` row.

---

## 5. Payment Authority

Only `order.paid` triggers fulfillment. Never:
- checkout return URL
- order.created
- checkout.updated

---

## 6. Snapshot Policy

At purchase creation, snapshot:
- `package_name_snapshot`
- `credits_snapshot`
- `validity_days_snapshot`
- `amount_total` / `currency`

Later package changes don't affect existing purchases.

---

## 7. Webhook Routing

```
metadata.domain = "package_purchase" → package handler
metadata.payment_intent_id → appointment handler
otherwise → SaaS billing handler
```

---

## 8. Package Pricing

Added to `service_packages`:
- `price_amount` (bigint, minor units)
- `price_currency` (TEXT, ISO 4217)
- Both NULL = not purchasable online

---

## 9. Security

- Active + public + priced packages only
- Tenant/customer relationship verified by DB trigger
- Server resolves price (never from client)
- RLS: tenant members can read, no direct writes

---

## 10. Tests: 30

- Event detection (4), statuses (2), payment authority (3)
- Price authority (4), fulfillment idempotency (2)
- Amount/currency verification (2), domain separation (3)
- Snapshot behavior (3), package usage compatibility (2)
- Additional contracts (5)
