# Gift Cards & Stored Value — Milestone 15.2

## Architecture

```text
Tenant enables gift cards
→ Creates products (denominations)
→ Customer purchases via Polar
→ order.paid webhook → fulfill_gift_card_purchase RPC
→ Gift card issued (code hashed, ledger entry)
→ Customer claims code (links to account)
→ Customer redeems at checkout (reservation → confirmation)
```

**Strictly separate from:** loyalty points, package credits, discount codes, Polar subscriptions.

---

## Database

**Migration:** `20260807000018_gift_cards.sql`

| Table | Purpose |
|---|---|
| `tenant_gift_card_settings` | Feature toggle, redemption rules, expiry config |
| `gift_card_products` | Predefined denominations |
| `gift_card_purchases` | Purchase records with Polar correlation |
| `gift_cards` | Issued cards with hashed code, balance, status |
| `gift_card_ledger_entries` | Append-only financial history |
| `gift_card_reservations` | Temporary holds during checkout |

**RPC:** `fulfill_gift_card_purchase` — atomic issuance with idempotency check

---

## Ledger

**Sign convention:** positive = credit (adds value), negative = debit (removes value)

**Entry types:**
- `issuance` — initial value loaded (+)
- `redemption` — spent at checkout (-)
- `redemption_reversal` — refund restores value (+)
- `refund_adjustment` — purchase refund removes value (-)
- `manual_adjustment` — admin correction (+/-)
- `expiry` — expired remaining value (-)

**Invariant:** `SUM(ledger amounts) = current_balance` (cached for reads)

---

## Code Security

- Generated with crypto `randomBytes` (16 chars, 32 possible values each)
- Typo-resistant charset (no 0/O/1/I)
- Format: `GS-XXXX-XXXX-XXXX-XXXX`
- **Raw code never stored** — only SHA-256 hash + 6-char prefix
- Code shown once at delivery, never logged
- Lookup by hash only (tenant-scoped)
- Rate-limited claim/redemption endpoints

---

## Redemption Flow

### Full gift card payment (no Polar needed):
```text
validate card → lock FOR UPDATE → check balance → debit ledger → mark appointment paid
```

### Partial gift card + Polar remainder:
```text
validate card → reserve amount → create Polar checkout for remainder
→ order.paid → confirm reservation → append ledger → mark paid
→ OR checkout expires → release reservation → balance available again
```

---

## Concurrency

- `FOR UPDATE` row lock on gift card during redemption/reservation
- Available balance = current_balance - SUM(active reservations)
- Two simultaneous spends cannot overspend (DB enforces)

---

## Explicit Confirmations

- Gift cards are tenant-scoped (Tenant A card cannot pay Tenant B)
- Raw codes never stored or logged
- Ledger is append-only (corrections via compensating entries)
- Balance cannot go negative (DB CHECK constraint)
- `order.paid` is authoritative for issuance (not checkout return)
- Duplicate webhooks cannot issue twice (idempotency in RPC)
- Reservations released on checkout expiry/failure
- Gift card redemption is NOT a discount
- Discount calculation occurs before gift card application
- Financial aggregation per currency (never cross-currency)
- No FX conversion
- No live Polar in tests
