# Polar Tenant Resource Sync

Milestone 11.7 — Completed August 2026.

---

## 1. Shared Polar Organization

All tenants share one Polar organization. Tenant isolation is enforced by get-slot:
- Queries always include `WHERE tenant_id = ...`
- Provider resources mapped per-tenant
- Organization-wide catalog never exposed to tenants

---

## 2. Local-First Sync Model

```
Tenant action → local record → sync_status=pending
  → server calls Polar API → provider_resource_id returned
  → sync_status=synced
```

Local record exists BEFORE provider call. A `pending` mapping with `null` provider_resource_id is valid.

---

## 3. Provider Resource Mapping

| Field | Purpose |
|-------|---------|
| `local_resource_id` | get-slot UUID |
| `provider_resource_id` | Polar ID (null until synced) |
| `sync_status` | pending/syncing/synced/failed/archived |
| `sync_version` | Optimistic concurrency (prevents stale response overwrite) |

---

## 4. Discount Model

- Percentage (1-99%, no 100% in v1)
- Fixed amount (minor units + currency)
- Tenant-scoped code (case-insensitive unique per tenant)
- Validity dates (starts_at, ends_at)
- Maximum redemptions
- Target types: all_appointments, all_packages, service, package

---

## 5. Discount Code Strategy (Shared Org)

Local code: `WELCOME10`
Provider code: `{tenantId_prefix}_WELCOME10`

This prevents cross-tenant code collision in the shared Polar organization while keeping the customer-facing code simple.

---

## 6. Checkout Discount Application

```
Customer enters code → server resolves tenant discount
  → validate: active, synced, dates, target, redemptions
  → resolve provider_discount_id from mapping
  → pass discount_id to Polar checkout
```

Customer NEVER submits provider_discount_id. Server resolves it.

---

## 7. Coupon Eligibility Requirements

Must satisfy ALL:
- `is_active = true`
- Current time within starts_at/ends_at
- Target matches (service/package/all)
- Redemptions below maximum
- `sync_status = synced` (provider_discount_id present)
- Final amount > 0 (no zero-checkout)

---

## 8. Redemption Tracking

| Status | When |
|--------|------|
| `reserved` | Checkout created with discount |
| `confirmed` | order.paid webhook received |
| `released` | Checkout abandoned/expired |

---

## 9. Cross-Tenant Protection

- Validation always filters `WHERE tenant_id = authorized_tenant`
- Browser cannot submit arbitrary Polar discount IDs
- Tenant A cannot see/use/modify Tenant B's discounts
- Provider-code namespacing prevents cross-tenant code reuse in Polar

---

## 10. Sync Version (Optimistic Concurrency)

If tenant edits discount while sync is in-flight:
- Local version increments to v2
- v1 sync response arrives
- Update only applies WHERE sync_version = v1 (fails, 0 rows updated)
- v2 remains pending for next sync attempt

---

## 11. Existing Checkout Compatibility

- Dynamic appointment checkout (no product required) unchanged
- Dynamic package checkout unchanged
- Discounts are optional additive feature
- Refunds use actual paid amount (post-discount)

---

## 12. Test Coverage: 35 tests

- Sync model (4), version race (2), discount types (2)
- Target types (1), redemption statuses (1)
- Cross-tenant isolation (3), validation rules (7)
- Amount calculation (4), redemption tracking (3)
- Checkout compatibility (2), SaaS separation (1)
- Additional contracts (5)
