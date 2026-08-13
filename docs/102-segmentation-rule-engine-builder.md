# 102 — Segmentation Rule Engine & Builder

> Milestone 15.6.1 — Customer Segmentation Rule Engine & Builder

## Overview

This document covers the custom customer segmentation system that allows tenants to define rule-based audience groups using a visual builder, evaluate membership dynamically via SQL, and manage segments through full CRUD.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Segment Builder UI                      │
│  (client-page.tsx — interactive rule builder)            │
└─────────────┬───────────────────────────────────────────┘
              │ createSegmentAction / updateSegmentAction
              ▼
┌─────────────────────────────────────────────────────────┐
│                   Rule Validator                          │
│  validate-segment-rules.ts                               │
│  • Max 20 rules, depth 2                                 │
│  • Field/operator type compatibility                     │
│  • Monetary fields require currency                      │
└─────────────┬───────────────────────────────────────────┘
              │ Validated SegmentRuleGroup JSON
              ▼
┌─────────────────────────────────────────────────────────┐
│                   Evaluation Service                      │
│  evaluate-segment.ts                                     │
│  • SQL field registry (server-controlled allowlist)      │
│  • ruleGroupToSQL() → WHERE clause                       │
│  • Parameterized evaluation via RPC / fallback           │
└─────────────────────────────────────────────────────────┘
```

## Key Design Decisions

| Decision | Chosen | Rejected | Reason |
|----------|--------|----------|--------|
| Evaluation method | SQL field registry | Load all customers in memory | N+1, won't scale |
| Rule storage | Structured JSON | Raw SQL | Security — no user SQL execution |
| Membership model | Dynamic (evaluated on read) | Stored membership rows | Avoids stale data |
| Complexity limits | Max 20 rules, depth 2 | Unlimited | Prevents pathological queries |

## Rule Schema

```typescript
type SegmentRuleGroup = {
  operator: "and" | "or";
  rules: Array<SegmentRule | SegmentRuleGroup>;
};

type SegmentRule = {
  field: SegmentField;
  operator: ComparisonOperator;
  value: unknown;
  currency?: string;
};
```

### Supported Fields (22)

- **Appointments:** total_appointments, completed_appointments, cancelled_appointments, no_show_count, first_appointment_date, last_appointment_date, days_since_last_appointment, has_upcoming_appointment
- **Service/Location:** has_booked_service, has_visited_location
- **Packages:** has_active_package, package_count
- **Loyalty:** loyalty_balance
- **Gift Cards:** has_gift_card, gift_card_count
- **Referrals:** was_referred, has_referred_others, successful_referral_count
- **Reviews:** has_left_review, review_count, average_rating
- **Payments:** lifetime_paid
- **Marketing:** marketing_opt_in

### Comparison Operators

- Numeric: equals, not_equals, greater_than, greater_than_or_equal, less_than, less_than_or_equal
- Date: before, after, within_last_days, more_than_days_ago
- Boolean: is_true, is_false
- Set: in, not_in

## SQL Field Registry

Each `SegmentField` maps to a server-controlled SQL expression. The browser never supplies SQL directly — only structured rule JSON that the server translates:

```typescript
// Example mapping
"completed_appointments" →
  (SELECT COUNT(*) FROM appointments a
   WHERE a.tenant_id = $tenantId
   AND a.customer_id = tc.id
   AND a.status = 'completed')
```

The `ruleGroupToSQL()` function recursively translates rule groups into WHERE clauses joined by AND/OR.

## Pages

| Route | Purpose |
|-------|---------|
| `/{slug}/customers/segments` | Dashboard — built-in + saved segments with counts |
| `/{slug}/customers/segments/new` | Builder — create new custom segment |
| `/{slug}/customers/segments/{id}` | Detail — rule summary, live count, paginated customers |
| `/{slug}/customers/segments/{id}/edit` | Edit — modify rules of an existing custom segment |

## CRUD Actions

All in `features/segmentation/actions/segment-actions.ts`:

- **createSegmentAction** — validates rules, inserts into `customer_segments`
- **updateSegmentAction** — validates, updates name/description/rules
- **duplicateSegmentAction** — copies segment with "Copy of" prefix
- **deleteSegmentAction** — hard delete with tenant isolation

## Built-In Segments

13 system segments defined in `features/segmentation/services/built-in-segments.ts`:

all_customers, new_customers, returning_customers, frequent_customers, inactive_customers, upcoming_appointments, no_upcoming_appointments, no_show_customers, active_packages, gift_card_holders, referral_acquired, referrers, has_review

These use the same rule schema as custom segments for consistent evaluation.

## Database

### Table: `customer_segments`

```sql
CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL DEFAULT 'custom',  -- 'system' | 'custom'
  rules JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS enforces tenant isolation via `tenant_id = auth.jwt()->>'tenant_id'`.

## Security

- No raw SQL from client — all rules translated server-side
- UUID validation for entity references
- Tenant isolation via RLS + explicit `tenant_id` filtering
- Role-based access: create/edit/delete require `owner` or `admin` role
- Rule complexity limits prevent denial-of-service queries

## Future Enhancements

- `evaluate_segment_count` RPC for full SQL-level evaluation
- `lifetime_paid` field with currency-aware join implementation
- Segment-based campaign targeting (Milestone 15.7+)
- Scheduled segment count caching for dashboard performance
