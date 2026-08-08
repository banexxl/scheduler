# Customer Loyalty & Rewards

**Milestone 8.10**

## Overview

Tenant-scoped loyalty program awarding points for completed appointments and tracking visit milestones. Rewards are informational/manual — no automatic booking discounts.

## Points Earning

- `points_per_completed_appointment` (configurable, default 0)
- Only awarded on transition to `completed`
- Idempotent: key `appointment:{id}:loyalty-earned` prevents double-award
- Requires customer_id on appointment
- Non-blocking: completion never fails from loyalty errors

## Visit Counting

- `completed_visit_count` incremented once per completed appointment (when enabled)
- No-show/cancelled do not count
- Package appointments still count

## Account Model

- `points_balance`: current available points (never negative)
- `lifetime_points_earned`: only increases on earned transactions
- `completed_visit_count`: appointment-derived count

## Ledger

Append-only `customer_loyalty_transactions`:
- transaction_type: earned / manual_credit / manual_debit / reversal / reward_redemption
- points_delta: positive or negative
- balance_after: snapshot for auditability
- idempotency_key: prevents duplicates

## Concurrency

`award_customer_loyalty_points` RPC: upserts account, locks row (FOR UPDATE), checks idempotency, atomically updates balance + lifetime + visits + inserts ledger.

## Rewards

- `points_threshold`: eligible when balance >= points_required
- `visit_threshold`: eligible when visit_count >= visits_required
- Active/inactive toggle
- Manual redemption (deducts points for points_threshold)
- Redemption history in customer_reward_redemptions

## Reversal

Completed is terminal in current status model — no automatic reversal path exists. Manual debit available for corrections.

## Settings

- `is_enabled` (default false — safe deployment)
- `points_per_completed_appointment`
- `count_completed_visits`
- `allow_manual_adjustments`

## Privacy

Loyalty balances private. Accessible only via authenticated business context or secure portal session. Never exposed from public email lookup.

## Files Created

```
supabase/migrations/20250805000031_customer_loyalty.sql
features/loyalty/types/loyalty.ts
features/loyalty/services/loyalty-award-service.ts
features/loyalty/services/loyalty-queries.ts
features/loyalty/actions/loyalty-actions.ts
features/loyalty/__tests__/loyalty-types.test.ts
docs/55-customer-loyalty-rewards.md
```

## Assumptions

- Customer identity uses tenant_customers.id
- Completed is terminal (no automatic reversal)
- Package appointments earn loyalty unless configured otherwise
- No payment-based earning in this milestone
