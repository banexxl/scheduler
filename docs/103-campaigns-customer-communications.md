# 103 — Campaigns & Customer Communications

> Milestone 15.7

## Overview

Production-safe tenant marketing campaign system built on the existing segmentation and notification infrastructure. Allows tenants to compose, target, test, schedule, and send email campaigns to customer segments with proper consent management.

## Architecture

```
Tenant → Create Campaign
       → Select Segment (saved or built-in)
       → Compose Message
       → Send Test / Send Now / Schedule
                    ↓
         Server Action (authenticate, authorize, validate)
                    ↓
         Atomic Status Transition (draft → processing)
                    ↓
         Audience Re-Evaluation (current data)
                    ↓
         Marketing Eligibility Check
                    ↓
         Recipient Snapshot (immutable)
                    ↓
         Batch Delivery (10 per round)
           ├── Late Suppression Check (per-recipient)
           ├── Unsubscribe Token Generation
           ├── Email Rendering (branding + content)
           └── Provider Dispatch (getEmailProvider().send())
                    ↓
         Campaign Completion (metrics updated)
```

## Critical Invariant

**Segment match ≠ Marketing eligibility.**

A customer matching a business segment DOES NOT imply permission to market to them.

The architecture is always:

```
Segment evaluation → Marketing eligibility → Recipient snapshot → Delivery
```

Never:

```
Segment → Provider (WRONG)
```

## Campaign Model

### Table: `customer_campaigns`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | FK tenants |
| name | TEXT | 1-200 chars |
| channel | TEXT | CHECK: 'email' |
| subject | TEXT | max 500 |
| content | TEXT | max 50000 |
| cta_text | TEXT | max 100 |
| cta_url | TEXT | max 2000, must be http(s):// |
| segment_id | UUID | FK customer_segments, nullable |
| audience_source | TEXT | 'segment' or 'built_in_segment' |
| audience_name_snapshot | TEXT | Frozen at execution |
| audience_rules_snapshot | JSONB | Frozen at execution |
| status | TEXT | draft/scheduled/processing/completed/cancelled/failed |
| scheduled_for | TIMESTAMPTZ | UTC |
| started_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |
| cancelled_at | TIMESTAMPTZ | |
| matched_count | INT | >= 0 |
| eligible_count | INT | >= 0 |
| sent_count | INT | >= 0 |
| delivered_count | INT | >= 0 |
| failed_count | INT | >= 0 |
| skipped_count | INT | >= 0 |
| branding_snapshot | JSONB | Nullable |
| created_by | UUID | FK auth.users |

### Table: `customer_campaign_recipients`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | FK |
| campaign_id | UUID | FK customer_campaigns |
| customer_id | UUID | FK tenant_customers, nullable |
| channel | TEXT | 'email' |
| recipient_email | TEXT | Validated format |
| status | TEXT | eligible/queued/sent/delivered/failed/skipped |
| skip_reason | TEXT | marketing_opt_out/missing_email/invalid_email/customer_blocked/late_unsubscribe/duplicate/provider_error |
| provider_message_id | TEXT | |
| sent_at | TIMESTAMPTZ | |
| failed_at | TIMESTAMPTZ | |
| error_code | TEXT | |

**Idempotency:** UNIQUE(campaign_id, customer_id, channel)

## Campaign Lifecycle

```
draft → scheduled (user schedules)
draft → processing (send now)
draft → cancelled (user cancels)
scheduled → processing (cron fires)
scheduled → cancelled (user cancels)
processing → completed (all recipients processed)
processing → failed (unrecoverable error)
```

## Audience Architecture

### Editing-Time Preview

While composing, the UI shows:
- Segment currently matches: N
- Eligible for email: M
- Excluded: N - M

These are **previews only**, not authoritative send counts.

### Execution-Time Re-Evaluation

When campaign execution begins:
1. Load campaign
2. Load segment rules (saved DB segment or built-in definition)
3. Re-evaluate segment using **current** customer data
4. Evaluate marketing eligibility for each match
5. Create immutable recipient snapshot
6. Queue eligible recipients for delivery

**Policy:** Audience is snapshotted immediately before delivery begins.

### Segment Mutation Safety

- Segment edit after campaign: campaign history unchanged (rules snapshotted)
- Segment deletion after campaign: campaign history unchanged (rules + name snapshotted)
- `audience_name_snapshot` + `audience_rules_snapshot` preserve full history

## Marketing Eligibility

One canonical server-side function: `evaluateMarketingEligibility()`

### Exclusion Reasons (in priority order)

| Reason | Source | Logic |
|--------|--------|-------|
| customer_blocked | tenant_customer_private.is_blocked | Blocked customers never receive marketing |
| marketing_opt_out | tenant_customers.marketing_opt_in = false | Customer hasn't opted in |
| missing_email | tenant_customers.email IS NULL | No destination |
| invalid_email | Email format regex | Malformed address |

### Marketing vs Transactional

Marketing opt-out does NOT disable:
- Appointment confirmations
- Appointment reminders
- Payment receipts
- Security/account communications
- Waitlist notifications

## Unsubscribe

### Route

`/book/{tenantSlug}/communications/unsubscribe/{token}`

### Token Model

- 32-byte random → base64url (43 chars)
- SHA-256 hash stored in `marketing_unsubscribe_tokens` table
- 10-char prefix for identification
- 1-year TTL
- Purpose-scoped: `marketing_unsubscribe`
- Tenant-scoped + customer-scoped

### Behavior

- Validates hashed token against DB
- Sets `marketing_opt_in = false` on `tenant_customers`
- Idempotent (multiple clicks safe)
- Shows confirmation: "Transactional messages will not be affected"

### Late Opt-Out Safety (PART 8)

If a customer unsubscribes between recipient snapshot and delivery:

```
10:00 — Recipient snapshot (customer eligible)
10:01 — Customer unsubscribes
10:02 — Delivery worker checks eligibility
        → isCustomerMarketingEligible() = false
        → recipient.status = 'skipped'
        → skip_reason = 'late_unsubscribe'
        → Email NOT sent
```

## Delivery Pipeline

### Reused Infrastructure

| Component | Source | How Used |
|-----------|--------|----------|
| Email provider | `getEmailProvider()` from notifications | Same SMTP/console abstraction |
| Sender identity | `resolveNotificationSettings()` | Same senderName, replyTo |
| Internal route auth | `isAuthorizedBearerSecret()` | Same NOTIFICATION_PROCESSOR_SECRET |
| Server logging | `createServerActionLogger()` | Same structured logging |
| Token pattern | Same 32-byte + SHA-256 | For unsubscribe tokens |

### New Infrastructure

| Component | Purpose |
|-----------|---------|
| `customer_campaign_recipients` table | Recipient snapshot + delivery tracking |
| Campaign processor RPCs | Atomic claim, completion, failure |
| `POST /api/internal/campaigns/process` | Cron endpoint for scheduled campaigns |

### Batch Processing

- Batch size: 10 recipients per delivery round
- Each recipient gets individual late suppression check
- Provider failures do not block remaining recipients
- Campaign-level failure only on unrecoverable errors

### Concurrency Safety

- `claim_scheduled_campaign` RPC: atomic UPDATE WHERE status='scheduled'
- Two workers cannot start the same campaign
- Processor retries cannot duplicate: UNIQUE(campaign_id, customer_id, channel)

## Tenant Branding

- Campaign emails use **published** branding from `resolvePublishedTenantTheme()`
- Draft branding is never exposed
- Theme applied: primaryColor, fontFamily, borderRadius
- Unsubscribe footer included in all marketing emails

## Server Logging

Instrumented actions:
- `campaign.create`
- `campaign.update`
- `campaign.test_send`
- `campaign.schedule`
- `campaign.send`
- `campaign.cancel`

**Never logged:** Campaign body, recipient email, unsubscribe tokens, provider credentials.

## CTA Security

- Server-side validation: must start with `http://` or `https://`
- DB CHECK constraint: `cc_cta_url_protocol`
- `javascript:`, `data:` protocols rejected
- Max 2000 chars

## Channel Scope

- **Email:** Mandatory, fully implemented
- **SMS:** Not exposed (no infrastructure exists)
- **WhatsApp/Push:** Not exposed

## Performance

- Segment evaluation via `evaluate_segment_count` / `evaluate_segment_customers` RPCs (database-level)
- Recipient creation uses batch DB operations
- Delivery in bounded batches (10)
- Recipient history paginated (25 per page)
- Dashboard counts via DB count aggregation
- No unbounded loops, no N+1 patterns

## Authorization

- Campaign create/update/schedule/send: `owner`, `admin`, `manager`
- Campaign delete: `owner`, `admin`
- Campaign view: any active tenant member
- Recipient data: tenant-isolated via RLS

## Empty Audience

If segment matches 0 customers or all are ineligible:
- Campaign transitions to `completed`
- `matched_count = 0`, `eligible_count = 0`
- No recipient rows created
- Not treated as infrastructure failure

## Pages

| Route | Purpose |
|-------|---------|
| `/{slug}/campaigns` | Dashboard — metrics + paginated table |
| `/{slug}/campaigns/new` | Multi-step builder |
| `/{slug}/campaigns/{id}` | Detail — metrics, info, recipients |
| `/{slug}/campaigns/{id}/edit` | Edit draft campaign |

## Deferred to 15.8

- Marketing automations / customer journeys
- Birthday campaigns
- Behavior-triggered sends
- Multi-step drip campaigns
- Recurring campaign schedules
- SMS channel
