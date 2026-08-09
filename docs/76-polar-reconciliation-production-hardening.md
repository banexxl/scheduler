# Polar Reconciliation & Production Hardening

Milestone 11.9 — Completed August 2026.

---

## 1. Reconciliation Philosophy

Webhooks = primary real-time sync.
Reconciliation = recovery for missed/stale/crashed states.

Never polls entire Polar organization. Always starts from
local tenant-scoped records with known provider IDs.

---

## 2. Recovery Scenarios

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Stale creating intent (>10min, no checkout ID) | Index scan | Mark failed |
| Paid but unfulfilled package | Status + fulfilled_at NULL | Retry fulfillment RPC |
| Pending refund (>10min) | Status + created_at | Query provider / retry |
| Provider resource failed sync | sync_status = failed | Retry with backoff |
| Local paid / provider unknown | Reconciliation check | manual_review (never downgrade) |
| Webhook missed | Stale pending records | Provider query + apply existing RPCs |

---

## 3. Hardened Provider Client

| Feature | Implementation |
|---------|---------------|
| Timeout | 12 seconds (AbortController) |
| Rate limit (429) | ProviderRateLimitError + backoff |
| Auth failure (401/403) | ProviderAuthenticationError — no retry |
| Not found (404) | ProviderNotFoundError — no retry |
| Server error (5xx) | ProviderUnavailableError — retryable |
| Validation (400/422) | ProviderValidationError — no retry |

---

## 4. Retry Policy

- Retryable: 429, 5xx, timeout
- NOT retryable: 400, 401, 403, 404
- Backoff: 1m → 5m → 15m → 1h → 6h → manual_review
- Max concurrent provider requests: 3-5

---

## 5. Financial Invariants

```
amount_paid >= 0
amount_refunded >= 0
amount_refunded <= amount_paid
status=paid → paid_at IS NOT NULL
status=fulfilled → customer_package_id IS NOT NULL
sync_status=synced → provider_resource_id IS NOT NULL
```

---

## 6. Manual Review Reasons

- provider_payment_state_mismatch
- amount_mismatch
- currency_mismatch
- missing_provider_order
- fulfilled_without_confirmed_payment
- provider_resource_missing
- retry_exhausted
- cross_tenant_metadata_mismatch

---

## 7. Production Schedule

| Processor | Frequency |
|-----------|-----------|
| Webhook retry | Every 5 min |
| Payment/package reconciliation | Every 10-15 min |
| Provider resource reconciliation | Hourly |
| Full invariant audit | Daily |

---

## 8. Internal Routes

| Route | Purpose |
|-------|---------|
| `POST /api/internal/payments/reconcile` | Full reconciliation |

All protected by existing bearer secret.

---

## 9. Test Coverage: 25 tests

- Provider error classification (6)
- Reconciliation invariants (5)
- Webhook replay safety (3)
- Cross-tenant metadata (1)
- SaaS isolation (2)
- Provider resource recovery (2)
- Financial invariants (4)
- Additional (2)
