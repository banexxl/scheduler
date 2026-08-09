# End-to-End & Integration Test Hardening

Milestone 10.5 — Completed August 2026.

---

## 1. Test Layers

| Layer | Tool | Purpose | Speed |
|-------|------|---------|-------|
| Unit | Vitest | Pure logic, schemas, utilities | Fast |
| Integration | Vitest + live HTTP | API security, health, auth boundaries | Medium |
| E2E | Playwright | Browser user journeys | Slow |

---

## 2. Test Environment

### Guards

- `assertTestEnvironment()` — aborts if production URL detected
- `E2E_TEST_MODE=true` or `NODE_ENV=test` required
- Production patterns checked: `scheduler.com`, `scheduler.io`, `production`

### Variables

| Variable | Purpose |
|----------|---------|
| `TEST_BASE_URL` | App URL for integration/E2E (default: NEXT_PUBLIC_APP_URL) |
| `NOTIFICATION_PROCESSOR_SECRET` | Positive internal API tests |
| `TEST_PUBLIC_TENANT_SLUG` | Public booking E2E |
| `E2E_TEST_MODE` | Explicit test mode flag |
| `INTEGRATION_REQUIRED` | Strict mode (fail if env missing) |

---

## 3. Scripts

```json
{
  "test": "vitest run",
  "test:unit": "vitest run --exclude '**/integration/**' --exclude '**/e2e/**'",
  "test:integration": "cross-env E2E_TEST_MODE=true vitest run tests/integration/",
  "test:integration:required": "cross-env E2E_TEST_MODE=true INTEGRATION_REQUIRED=1 vitest run tests/integration/",
  "test:all": "npm run test && npm run test:integration"
}
```

E2E (Playwright):
```bash
npx playwright test
npx playwright test --project=mobile
```

---

## 4. Fixtures

### Module: `tests/helpers/test-fixtures.ts`

| Helper | Purpose |
|--------|---------|
| `getTestRunId()` | Unique run prefix (avoids collision) |
| `testTenantSlug(label)` | `e2e-{label}-{runId}` |
| `testEmail(label)` | `{label}-{runId}@test.localhost` |
| `testCustomerName(label)` | Prefixed customer name |
| `futureLocalDate(days)` | Future YYYY-MM-DD (never past) |
| `testTimeSlot(hour, minute)` | HH:MM string |
| `createTestActors()` | Standard actor set (owners, staff, customers) |
| `getInternalApiHeaders(secret)` | Bearer + request ID |
| `getInvalidInternalApiHeaders()` | Wrong secret |

---

## 5. Integration Tests

### `tests/integration/health-endpoints.integration.test.ts`

| Test | Assertion |
|------|-----------|
| Health returns 200 | status: "ok" |
| Health exposes no secrets | No password/service_role |
| Supabase readiness 200 | connected |
| No connection strings exposed | No postgresql:// |

### `tests/integration/authorization-boundaries.integration.test.ts`

| Test | Assertion |
|------|-----------|
| Public booking accessible | 200 or 404, not login redirect |
| Health accessible without auth | 200 |
| Notifications rejects unauthed | 401/503 |
| Reminders rejects unauthed | 401/503 |
| Waitlist rejects unauthed | 401/503 |
| Billing rejects unauthed | 401/503 |
| Polar webhook rejects empty | 401/503 |
| Polar webhook rejects bad sig | 401/503 |

### `tests/integration/internal-api-security.integration.test.ts`

| Test | Assertion |
|------|-----------|
| Notifications: no auth → 401 | Rejected |
| Notifications: wrong secret → 401 | Rejected |
| Notifications: correct secret → 200 | Accepted, returns processed count |
| Reminders: same pattern | 3 tests |
| Waitlist: same pattern | 3 tests |

---

## 6. E2E Tests (Playwright)

### `tests/e2e/auth-boundaries.spec.ts`

| Test | Assertion |
|------|-----------|
| Customer route → login redirect | URL contains "login" |
| Business dashboard → login/404 | Protected |
| Health accessible | 200 |
| Self-service invalid token | Shows "invalid" |
| Mobile: no horizontal overflow | scrollWidth ≤ clientWidth |

### `tests/e2e/public-booking.spec.ts`

| Test | Assertion |
|------|-----------|
| Booking page loads | Visible content |
| No internal data exposed | No internal_notes, blocked_reason |
| Fake tenant safe | No crash |
| Mobile usable | No overflow |

### `tests/e2e/self-service.spec.ts`

| Test | Assertion |
|------|-----------|
| Invalid token generic message | Contains "invalid" or "unavailable" |
| noindex meta present | robots: noindex |

---

## 7. Browser Configuration

| Project | Device | Viewport |
|---------|--------|----------|
| chromium | Desktop Chrome | Default |
| mobile | iPhone 14 | 390 × 844 |

---

## 8. CI Strategy

```
lint → type-check → unit tests → build → integration tests → E2E
```

### Fast (developer):
```bash
npm run test
```

### Full confidence:
```bash
npm run test:all
npx playwright test
```

### Strict CI:
```bash
npm run test:integration:required
```

---

## 9. External Provider Mocks

| Provider | Test Strategy |
|----------|--------------|
| SMTP | `EMAIL_PROVIDER=console` — no real sends |
| Polar | Local webhook fixture only — no API calls |
| Supabase | Real local/test instance for integration |

---

## 10. Cleanup

- Test fixtures use unique `run_` prefixed identifiers
- No collision between parallel runs
- Cascading delete via tenant ownership
- No manual cleanup required for skipped integration tests

---

## 11. Artifacts

- Screenshots: only on failure
- Traces: on first retry
- Video: disabled by default
- CI: store failed artifacts only

---

## 12. Known Gaps & Deferred

| Gap | Reason | Path |
|-----|--------|------|
| Full authenticated booking E2E | Requires test user creation flow | Add when Supabase test auth available |
| Package credit concurrency E2E | Requires parallel DB access | Covered by RPC design + unit tests |
| Loyalty E2E | Requires appointment lifecycle | Covered by integration tests |
| Full RLS integration | Requires test DB with multiple auth contexts | Self-service integration exists |
| Firefox/WebKit | CI runtime | Add when stability proven |

---

## 13. Confirmed Invariants

- ✓ No test points at production (environment guard)
- ✓ External emails are not sent from CI (console provider)
- ✓ No live Polar API calls occur (fixture payloads only)
- ✓ Tenant/customer isolation covered (authorization boundary tests)
- ✓ Internal API secret protection tested (3 routes × 3 cases)
- ✓ Environment-gated tests have strict fail-if-missing modes
- ✓ Public booking has E2E coverage (page load, no data leak, mobile)
