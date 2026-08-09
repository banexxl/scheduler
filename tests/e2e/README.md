# E2E Tests

Browser-based end-to-end tests using Playwright.

## Setup

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Running

```bash
npx playwright test                    # all specs
npx playwright test e2e/auth.spec.ts   # single spec
```

## Environment

Requires running dev server (`npm run dev`) or `TEST_BASE_URL` set.

Set `E2E_TEST_MODE=true` to enable test-specific behavior.

## Writing Tests

- Use semantic selectors: `getByRole`, `getByLabel`, `getByText`
- Add `data-testid` only when semantic selectors are unreliable
- Use helpers from `tests/helpers/` for fixture generation
- Keep tests independent — no shared mutable state between specs
