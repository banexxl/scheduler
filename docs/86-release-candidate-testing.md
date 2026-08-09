# Release Candidate Testing

Milestone 13.1 — August 2026.

---

## 1. Verification Command

```bash
npm run verify:rc
```

Runs: lint → type-check → unit tests → build → integration tests

E2E separately:
```bash
npm run test:e2e
```

---

## 2. Test Layers

| Layer | Tool | Command | Environment |
|-------|------|---------|-------------|
| Unit | Vitest | `npm run test` | None needed |
| Integration | Vitest + HTTP | `npm run test:integration:required` | TEST_BASE_URL |
| E2E | Playwright | `npm run test:e2e` | TEST_BASE_URL + running app |

---

## 3. E2E Coverage

| Spec | Flow |
|------|------|
| `auth-boundaries.spec.ts` | Protected routes redirect, public accessible |
| `public-booking.spec.ts` | Page load, no data leak, mobile |
| `self-service.spec.ts` | Token generic errors, noindex |
| `business-navigation.spec.ts` | All 16 business routes render |
| `appointment-lifecycle.spec.ts` | Create, detail page |
| `my-day.spec.ts` | Staff view, mobile usable |
| `notifications-health.spec.ts` | Notification center, health center, /api/health |

---

## 4. RC Exit Criteria

- ✅ `npm run lint` — 0 errors
- ✅ `npm run type-check` — 0 errors
- ✅ `npm run test` — all pass
- ✅ `npm run build` — succeeds
- ✅ `npm run test:integration:required` — pass (with env)
- ✅ `npm run test:e2e` — pass (with env + running app)
- ✅ No Blocker defects
- ✅ No High defects

---

## 5. Defect Severity

| Level | Criteria | Allowed at RC |
|-------|----------|:-------------:|
| Blocker | Cross-tenant leak, payment corruption, build failure | ✗ |
| High | Broken primary flow, security bypass | ✗ |
| Medium | UX issue, non-critical edge case | Documented |
| Low | Cosmetic, minor polish | Backlog |
