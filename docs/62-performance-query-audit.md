# Performance, Query Efficiency & Data-Access Audit

Milestone 10.2 — Completed August 2026.

---

## 1. Query Service Inventory

| Service | Classification | Optimization |
|---------|---------------|--------------|
| `get-dashboard-analytics.ts` | aggregate | **Rewritten** → SQL RPC |
| `get-today-summary.ts` | aggregate | **Rewritten** → SQL RPC |
| `customer-queries.ts` (list) | paginated-list | **Fixed** N+1 → batched RPC |
| `customer-queries.ts` (detail) | single-row + bounded | **Fixed** unbounded join → bounded sub-queries |
| `appointment-queries.ts` (list) | paginated-list | Already correct (limit/range) |
| `appointment-queries.ts` (blocking) | bounded-list | Already correct (range overlap) |
| `unified-appointment-queries.ts` | cross-tenant-read | Already correct (paginated, link-verified) |
| `package-queries.ts` (usage) | bounded-list | **Fixed** → max 100 limit |
| `package-queries.ts` (adjustments) | bounded-list | **Fixed** → max 100 limit |
| `package-queries.ts` (list) | bounded-list | Already correct (batched IN) |
| `waitlist-join-service.ts` | single-row | Already correct (bounded) |
| `waitlist-matching.ts` | bounded-list | Already correct (max 100 candidates) |
| `process-notifications.ts` | worker-batch | Already correct (SKIP LOCKED, batch limit) |
| `process-reminders.ts` | worker-batch | Already correct (batch limit) |
| `waitlist-expiration.ts` | worker-batch | Already correct (bounded) |
| `review-token-service.ts` | single-row | Already correct |
| `portal-appointment-queries.ts` | bounded-list | Already correct |
| `public-booking` services | public-read | Already correct (rate-limited, bounded) |

---

## 2. N+1 Issues Found & Fixed

| Location | Issue | Fix |
|----------|-------|-----|
| `getCustomersList` | Joined ALL appointments per customer (unbounded) to determine `hasUpcomingAppointments` | Removed join. Now uses batched `get_customers_with_upcoming_flag` RPC for the page of customers |
| `getCustomerById` | Joined ALL appointments for single customer | Split into 2 bounded sub-queries (10 upcoming + 10 recent) |

---

## 3. Unbounded Query Issues Found & Fixed

| Location | Issue | Fix |
|----------|-------|-----|
| `getDashboardAnalytics` | Loaded up to 15,000 rows (5000 × 3 queries) into Node for aggregation | Replaced with single `get_dashboard_analytics_summary` RPC |
| `getTodaySummary` | Loaded all today's rows to count statuses | Replaced with `get_today_appointment_counts` RPC |
| `getPackageUsageHistory` | No limit on history rows | Added `limit` parameter (default 50, max 100) |
| `getPackageAdjustments` | No limit on adjustment rows | Added `limit` parameter (default 50, max 100) |

---

## 4. Pagination Bounds

| Surface | Default | Max | Enforced |
|---------|:-------:|:---:|:--------:|
| Customer list | 50 | 100 | ✓ |
| Appointment list | 50 | — | via range |
| Unified customer appointments | 25 | — | via range |
| Package usage history | 50 | 100 | ✓ |
| Package adjustments | 50 | 100 | ✓ |
| Notification worker batch | 10 | 50 | ✓ |
| Reminder worker batch | 10 | 50 | ✓ |
| Waitlist matching candidates | — | 100 | ✓ |
| Billing reconciliation | — | 200 | ✓ |

---

## 5. Analytics Strategy

### Before (Milestone 8.4)
- Loaded 5,000 appointment rows for period
- Loaded 5,000 rows for comparison period
- Loaded 5,000 rows for new/returning customer detection
- All aggregation computed in Node.js
- ~15,000 rows transferred per dashboard load

### After (Milestone 10.2)
- Single `get_dashboard_analytics_summary` RPC call
- All aggregation in PostgreSQL (COUNT, SUM, FILTER, GROUP BY)
- Returns compact JSONB (~2KB) with all metrics
- Daily trend via `generate_series` + lateral join
- Top services/resources/locations via GROUP BY + LIMIT 10
- New vs returning via EXISTS subquery

**Estimated improvement:** 15,000 rows → 1 JSONB response (~99.9% reduction in data transfer)

---

## 6. Index Strategy

### New Indexes (Migration 20260807000002)

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_appointments_tenant_starts_at` | appointments | (tenant_id, starts_at) | Calendar, analytics range |
| `idx_appointments_tenant_status_starts_at` | appointments | (tenant_id, status, starts_at) | Status-filtered lists |
| `idx_appointments_tenant_customer_starts_at` | appointments | (tenant_id, customer_id, starts_at) | Customer appointment lookup |
| `idx_appointments_tenant_service_starts_at` | appointments | (tenant_id, service_id, starts_at) | Service analytics |
| `idx_appointments_tenant_resource_starts_at` | appointments | (tenant_id, resource_id, starts_at) | Resource analytics, blocking |
| `idx_appointments_tenant_location_starts_at` | appointments | (tenant_id, location_id, starts_at) | Location analytics |
| `idx_notification_outbox_pending` | notification_outbox | (status, next_attempt_at) WHERE pending/retrying | Worker claim |
| `idx_appointment_reminders_due` | appointment_reminders | (status, scheduled_at) WHERE pending | Reminder worker |
| `idx_waitlist_entries_active` | waitlist_entries | (tenant_id, service_id, status, preferred_date_from) WHERE active | Waitlist matching |
| `idx_customer_account_tenant_links_account_linked` | customer_account_tenant_links | (customer_account_id, link_status) WHERE linked | Cross-tenant queries |
| `idx_appointments_tenant_customer_status_future` | appointments | (tenant_id, customer_id, status, starts_at) WHERE not terminal | Has-upcoming check |

---

## 7. Worker Efficiency

| Worker | Claim Pattern | Index Support | Empty-Poll Cost |
|--------|--------------|:-------------:|:---------------:|
| Notification processor | `SKIP LOCKED` + status filter | `idx_notification_outbox_pending` | Index-only scan |
| Reminder processor | status + scheduled_at filter | `idx_appointment_reminders_due` | Index-only scan |
| Waitlist expiration | status + date filter | `idx_waitlist_entries_active` | Index-only scan |
| Billing webhook processor | `SKIP LOCKED` via RPC | Existing indexes | Bounded |

---

## 8. Customer Search

- Minimum search length: 2 characters (prevents single-char ILIKE)
- Uses `OR` pattern: name/email/phone
- Bounded to page size (max 100)
- Future optimization: trigram index or full-text search (deferred)

---

## 9. Rate Limiter Memory Safety

- Cleanup interval: 5 minutes
- Stale threshold: 20 minutes
- Entries older than threshold are removed
- Prevents unbounded Map growth in long-running processes

---

## 10. Deferred Optimizations

| Item | Reason | When |
|------|--------|------|
| Redis rate limiting | Requires infrastructure | Production deployment |
| Full-text search (trigram) | Requires pg_trgm extension | When search performance degrades |
| Materialized analytics views | Over-optimization at current scale | 100K+ appointments |
| Query result caching | Adds complexity | When latency is measured issue |
| CDN for media | Infrastructure change | Production |

---

## 11. Performance Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Customer ILIKE search on large tables | Medium | Min 2 chars + bounded results |
| Analytics new/returning customer EXISTS | Medium | Indexed (tenant_id, customer_email, starts_at) |
| In-memory rate limiter per-instance | Medium | Documented; Redis path available |
| No query timing instrumentation | Low | Add when needed for diagnosis |
| Large tenant with 100K+ appointments | Low | All queries indexed and bounded |

---

## 12. Test Coverage

| Test File | Tests | Coverage |
|-----------|:-----:|---------|
| `analytics-performance.test.ts` | 25 | Bounds, pagination, batch limits, index coverage, worker limits, rate limiter safety |

---

## 13. Confirmed Invariants

- ✓ No optimization weakened tenant/customer authorization
- ✓ No unbounded analytics query remains on the dashboard
- ✓ No known major N+1 query remains on primary user flows
- ✓ Public availability remains bounded
- ✓ Worker batches remain bounded
- ✓ No Redis/external cache was added
- ✓ No new Polar/payment functionality was implemented
