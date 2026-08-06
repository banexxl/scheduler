# 40 - Polar Foundation, Products, Prices, and Webhook Ingestion

Milestone 7.1 establishes the billing catalog foundation for Polar integration.

## 1. Scope

Implemented in this milestone:

- Local billing plans foundation with stable plan keys
- Polar product mapping onto local plans
- Polar price synchronization and archival for missing prices
- Durable webhook event ingestion with signature verification
- Internal webhook processing worker route with claim/retry behavior
- Internal sync and reconciliation routes
- Platform admin diagnostics page for plans/prices/events/runs

Explicitly out of scope:

- Checkout session creation
- Customer subscription lifecycle changes
- Invoice/payment collection logic
- Entitlements enforcement
- Tenant plan switching UI

## 2. Database Migration

Created migration:

- supabase/migrations/20250805000020_polar_foundation.sql

Adds tables:

- billing_plans
- billing_plan_prices
- billing_webhook_events
- billing_sync_runs

Adds:

- constraints for key/length/format correctness
- unique mapping constraint for non-null polar_product_id
- JSON shape checks for metadata payloads
- updated_at triggers
- RLS enablement and platform-admin select policies
- claim_billing_webhook_events(p_worker_id, p_batch_size) RPC with FOR UPDATE SKIP LOCKED and stale-lock recovery

Seeds stable local plans:

- free
- starter
- professional
- business

## 3. Server Modules

Added billing foundation modules:

- features/platform/services/polar-config.ts
- features/platform/services/polar-client.ts
- features/platform/services/polar-normalize.ts
- features/platform/services/polar-webhook-signature.ts
- features/platform/services/billing-webhook-events.ts
- features/platform/services/process-billing-webhooks.ts
- features/platform/services/sync-polar-product.ts
- features/platform/services/billing-catalog-queries.ts

Key behaviors:

- webhook payload hash and unique event deduplication
- normalized event-type handling (`product.created`, `product.updated`)
- event-order protection through `polar_modified_at` checks
- checkout eligibility classifier for recurring supported interval prices
- retry scheduling with exponential backoff and max-attempt cutoff

## 4. Routes

Implemented:

- POST /api/webhooks/polar
  - raw body signature validation (HMAC-SHA256)
  - durable event storage in billing_webhook_events
  - duplicate-event safety via unique polar_event_id

- POST /api/internal/billing/process-webhooks
  - protected by BILLING_PROCESSOR_SECRET
  - claims pending events via RPC and dispatches handlers

- POST /api/internal/billing/sync-products
  - protected by BILLING_SYNC_SECRET or BILLING_PROCESSOR_SECRET fallback
  - initial/manual product synchronization

- POST /api/internal/billing/reconcile-products
  - protected by BILLING_SYNC_SECRET or BILLING_PROCESSOR_SECRET fallback
  - reconciliation synchronization run

## 5. Platform Admin Actions and Diagnostics

Implemented actions:

- mapPolarProductToPlanAction(planId, polarProductId)
- refreshPolarProductsAction()

Implemented diagnostics page:

- /platform/billing/products

Page capabilities:

- view billing plans and mapped Polar product IDs
- manually map product IDs per plan
- trigger full product refresh
- view recent webhook event statuses
- view recent sync runs

## 6. Environment Variables

Added environment docs for:

- POLAR_API_BASE_URL
- POLAR_ACCESS_TOKEN
- POLAR_ORGANIZATION_ID
- POLAR_WEBHOOK_SECRET
- BILLING_PROCESSOR_SECRET
- BILLING_SYNC_SECRET

Updated files:

- .env.example
- README.md
- lib/environment/server.ts

## 7. Verification Commands

Run:

- npm run lint
- npm run type-check
- npm run test
- npm run build

## 8. Notes

- Free plan remains local-only and can intentionally be left unmapped.
- Unsupported webhook event types are safely marked ignored.
- This milestone intentionally does not expose checkout/payment operations.
