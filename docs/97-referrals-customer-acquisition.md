# Referral Program & Customer Acquisition — Milestone 15.3

## Part A — Tenant Lifecycle Cleanup

**Migration:** `20260807000019_sync_tenant_lifecycle_safety.sql`

Captures all manually-applied fixes into authoritative migration history:

| Function | Fix |
|---|---|
| `prevent_last_tenant_owner_removal` | Added `app.deleting_tenant` tenant-specific bypass |
| `safe_remove_tenant_member` | Changed `'inactive'` → `'suspended'` |
| `delete_tenant_permanently` | Added `set_config` + REVOKE from authenticated/anon |
| `delete_tenant_for_test` | Added `set_config` + REVOKE from authenticated/anon |

**Key rules:**
- Last-owner protection active during normal operations
- Bypass is tenant-specific (`app.deleting_tenant = tenant_id::text`)
- Bypass is transaction-local (`set_config(..., true)`)
- Deletion RPCs are service-role only
- Server action performs authenticated owner verification BEFORE using service-role

---

## Part B — Referral Architecture

### Domain Model

```text
Tenant enables referral program
→ Customer gets referral code
→ New customer arrives with code
→ Attribution recorded
→ Qualifying appointment completed
→ Referral qualified
→ Reward issued (loyalty/discount/gift-card)
```

### Qualification Rule

`first_completed_appointment` — the referred customer's first completed appointment with the tenant triggers qualification.

### Anti-Abuse

- Self-referral prevented (referrer ≠ referred customer)
- Existing customer prevention (must be genuinely new to tenant)
- One acquisition per referred customer per tenant (UNIQUE constraint)
- Cancelled/no-show appointments do not qualify
- Recurring series: only first appointment qualifies (one acquisition per customer)
- Attribution window: configurable (1–365 days, default 30)

### Reward Types

| Type | Delivered via |
|---|---|
| `loyalty_points` | Existing loyalty ledger |
| `fixed_discount` | Existing discount engine |
| `percentage_discount` | Existing discount engine |

### Tables

- `tenant_referral_programs` — program configuration per tenant
- `referral_codes` — customer-owned, globally unique codes
- `customer_referrals` — attribution + lifecycle tracking

### RLS

- Member read on all tables
- Owner/admin write on program settings
- No RLS recursion (uses established `tenant_members` pattern)
- No public direct access to referral tables

---

## Explicit Confirmations

- Last-owner protection enforced normally
- Deletion bypass is tenant-specific and transaction-local
- Permanent deletion RPC not callable by authenticated/anon
- Service role used only after server-side owner auth
- Migration history now represents all known fixes
- Referrals are tenant-scoped
- Self-referrals cannot qualify
- One acquisition per customer per tenant
- Cancelled/no-show don't qualify
- Recurring series cannot multiply rewards
- Reward issuance through existing loyalty/discount systems
- No RLS recursion introduced
- `page.tsx` remain Server Components
- No new UI framework
