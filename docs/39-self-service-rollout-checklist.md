# 39 - Self-Service Rollout Checklist

This checklist is intended for Milestone 6.14 production rollout.

## 1. Pre-Deployment

- Ensure the migration file exists:
  - supabase/migrations/20250805000019_appointment_self_service.sql
- Confirm environment variables are set in all runtime environments:
  - PUBLIC_APP_URL
  - APPOINTMENT_TOKEN_ENCRYPTION_KEY
- Confirm APPOINTMENT_TOKEN_ENCRYPTION_KEY decodes to exactly 32 bytes.
- Ensure notification templates support manage_appointment_url placeholder.

## 2. Apply Database Changes

1. Apply migration:
   - supabase/migrations/20250805000019_appointment_self_service.sql
2. Regenerate database types:
   - npm run db:types
3. Verify new objects exist:
   - appointment_access_tokens
   - appointment_customer_actions
   - appointment_customer_requests
   - rotate_appointment_access_token function

## 3. Security Verification

- Verify public token route exists:
  - /manage-appointment/[token]
- Verify invalid, expired, and revoked tokens all return the same public message.
- Verify token hash/ciphertext are never returned in client payloads.
- Verify token table and action log are not readable by public client.
- Verify mutation origin checks reject non-trusted origins.
- Verify noindex/no-store/no-referrer behavior for tokenized pages.

## 4. Functional Verification

- Generate link from internal appointment detail page.
- Open link and verify appointment summary rendering.
- Cancel eligible appointment and verify final state + idempotent repeat behavior.
- Reschedule eligible appointment and verify stale-slot and DETAILS_CHANGED behavior.
- Revoke link and verify public access fails immediately.

## 5. Notifications and Reminders

- Verify appointment-created flow generates link when customer email exists.
- Confirm side-effect hooks execute without breaking appointment mutation flow.
- If notification/reminder transport is enabled in your environment, verify:
  - created notification includes management URL
  - rescheduled notification includes management URL
  - cancellation notification optionally includes management URL

## 6. Commands

Run:

- npm run lint
- npm run type-check
- npm run test
- npm run build

## 7. Optional Integration Tests (Live DB)

The file below includes env-gated integration coverage for RLS and token-rotation race behavior:

- features/appointments/self-service/appointment-self-service.integration.test.ts
- scripts/check-self-service-integration-env.mjs

Set these variables to enable privileged scenarios:

- TEST_SELF_SERVICE_TENANT_ID
- TEST_SELF_SERVICE_APPOINTMENT_ID
- TEST_SELF_SERVICE_OWNER_JWT
- OR TEST_SELF_SERVICE_OWNER_EMAIL + TEST_SELF_SERVICE_OWNER_PASSWORD
- SUPABASE_SERVICE_ROLE_KEY

Without these variables, privileged integration tests are skipped by design.

To enforce these tests in CI, run:

- npm run test:self-service:integration:required

This command fails fast when required integration-test environment variables are missing.

## 8. Rollback Guidance

- Revoke active appointment access tokens for affected appointments if compromise is suspected.
- Rotate APPOINTMENT_TOKEN_ENCRYPTION_KEY only with key-version migration planning.
- If rollback is required, keep migration state consistent across all app instances.

## 9. Explicitly Not Included

- Customer accounts/password flows
- Payments/refunds/deposits/fees
- Recurring/group/waitlist bookings
- External calendar synchronization
