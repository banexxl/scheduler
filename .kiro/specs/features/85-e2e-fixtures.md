# E2E Fixtures & Seed Data

Milestone 13.1 — August 2026.

---

## 1. Seed Command

```bash
npm run seed:e2e
```

Creates deterministic test fixtures. Safe to run repeatedly.

---

## 2. Fixture Tenants

| Tenant | Purpose |
|--------|---------|
| `e2e-salon` | Single-location, basic booking, no payment |
| `e2e-clinic` | Multi-location, packages, loyalty |
| `e2e-payments` | Online payment flows, discounts |
| `e2e-incomplete` | Health center, empty states, onboarding |

---

## 3. Fixture Accounts

| Account | Tenant | Role |
|---------|--------|------|
| `owner+e2e-salon@example.test` | Salon | Owner |
| `admin+e2e-salon@example.test` | Salon | Admin |
| `ana+e2e-salon@example.test` | Salon | Staff (linked) |
| `marko+e2e-salon@example.test` | Salon | Staff (linked) |
| `owner+e2e-clinic@example.test` | Clinic | Owner |
| `customer+e2e@example.test` | — | Customer account |

---

## 4. Environment

Required:
- `TEST_BASE_URL` — app URL for E2E
- `E2E_TEST_MODE=true` — safety guard
- Supabase test project (separate from production)

---

## 5. Safety

- `assertTestEnvironment()` rejects production URLs
- Test emails use `@example.test` domain
- No real financial charges
- No real email delivery
- Cleanup: `npm run seed:e2e` (re-runs are idempotent)

---

## 6. Fixture Dates

Appointments use relative dates:
- Tomorrow, +2 days (upcoming)
- -7 days (completed history)
- -14 days (cancelled/no-show)

Tenant timezone used for all calculations.
