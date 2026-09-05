# Customer Segmentation & Marketing Foundation — Milestone 15.6

## Customer Intelligence Sources

| Domain | Canonical Table | Key Fields |
|---|---|---|
| Identity | `tenant_customers` | id, name, email, marketing_opt_in |
| Appointments | `appointments` | tenant_id, customer_id, status, starts_at, completed_at |
| Payments | `appointment_payments`, `payment_intents` | amount_paid, currency |
| Packages | `customer_packages` | status, credits_remaining |
| Loyalty | `customer_loyalty_accounts` | points_balance |
| Gift Cards | `gift_cards` | claimed_by_customer_account_id, current_balance |
| Referrals | `customer_referrals` | referrer_customer_id, referred_customer_id |
| Reviews | `customer_reviews` | rating |
| Marketing | `tenant_customers.marketing_opt_in` | boolean + timestamp |

---

## Built-In Segments

| Key | Name | Definition |
|---|---|---|
| all_customers | All Customers | No filter |
| new_customers | New Customers | completed_appointments <= 1 |
| returning_customers | Returning Customers | completed_appointments >= 2 |
| frequent_customers | Frequent Customers | completed_appointments >= 5 |
| inactive_customers | Inactive Customers | last_appointment > 90 days AND no upcoming |
| upcoming_appointments | Upcoming Appointments | has future appointment |
| no_upcoming_appointments | No Upcoming | no future appointment |
| no_show_customers | No-Shows | no_show_count >= 1 |
| active_packages | Package Holders | has active package |
| gift_card_holders | Gift Card Holders | has claimed gift card |
| referral_acquired | Referral-Acquired | was referred |
| referrers | Referrers | has referred others |
| has_review | Reviewers | has left review |

---

## Custom Rule Schema

```json
{
  "operator": "and",
  "rules": [
    { "field": "completed_appointments", "operator": "greater_than_or_equal", "value": 5 },
    { "field": "days_since_last_appointment", "operator": "greater_than_or_equal", "value": 60 }
  ]
}
```

**Limits:** max 20 rules, max nesting depth 2.

---

## Supported Fields & Operators

| Field | Type | Valid Operators |
|---|---|---|
| total/completed/cancelled_appointments, no_show_count | Numeric | =, !=, >, >=, <, <= |
| days_since_last_appointment, package_count, etc. | Numeric | =, !=, >, >=, <, <= |
| lifetime_paid | Numeric + Currency | =, !=, >, >=, <, <= (requires currency) |
| has_upcoming_appointment, has_active_package, etc. | Boolean | is_true, is_false |
| first/last_appointment_date | Date | before, after, within_last_days, more_than_days_ago |
| has_booked_service, has_visited_location | Entity | in, not_in, equals |

---

## Currency Semantics

- Monetary fields REQUIRE explicit currency in the rule
- Different currencies NEVER aggregated (`RSD + EUR` impossible)
- Evaluation filters by matching currency only

---

## Marketing Eligibility

**Existing:** `tenant_customers.marketing_opt_in` + `marketing_opt_in_at`

**Distinction:**
- Transactional (confirmations, reminders, receipts) — always delivered
- Marketing (campaigns, promotions) — requires opt-in

**Missing consent ≠ marketing permission.**

---

## Dynamic Membership

- No `segment_members` table — membership evaluated at query time
- Customer behavior changes → segment membership changes immediately
- Future campaigns (15.7) will snapshot recipients at send time

---

## Explicit Confirmations

- Segments don't own/duplicate customer identity
- Membership is dynamic (no stored membership rows)
- Rules are structured JSON, never raw SQL
- Fields validated against allowlist
- Browser tenant IDs are not authorization
- Referenced entity IDs are tenant-validated
- Tenant A cannot evaluate Tenant B customers
- Currencies never combined
- No campaign sending in 15.6
- No automated journeys in 15.6
