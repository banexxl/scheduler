# 104 — Marketing Automations & Customer Journeys

> Milestone 15.8

## Overview

Tenant-scoped automated customer journeys triggered by behavior. Builds on existing segmentation, campaign delivery, marketing eligibility, and notification infrastructure.

```
Trigger Event (or Scheduled Discovery)
        ↓
Enrollment (idempotent, versioned)
        ↓
Step Sequence: Delay → Condition → Email
        ↓
Marketing Eligibility Check (per email step)
        ↓
Existing Campaign Delivery Infrastructure
        ↓
Next Step / Completion
```

## Key Distinction

| Concept | Definition |
|---------|-----------|
| Campaign | One audience snapshot + one message execution |
| Automation | Reusable rule: WHEN trigger → WHAT steps happen |

Automations are NOT recurring campaigns. They are customer lifecycle journeys.

## Automation Model

### Table: `marketing_automations`

| Field | Notes |
|-------|-------|
| id, tenant_id | Standard |
| name, description | 1-200 chars |
| trigger_type | 6 supported types |
| trigger_config | JSONB (type-specific params) |
| entry_conditions | Optional JSONB rule group |
| re_enrollment_policy | once_ever / once_per_trigger / after_completion |
| timezone | Tenant timezone for scheduling |
| status | draft / active / paused / archived |
| current_version_id | FK to published version |

### Statuses & Transitions

```
draft → active (activate/publish)
draft → archived
active → paused
paused → active (resume)
paused → archived
archived → (terminal)
```

## Versioning

### Table: `marketing_automation_versions`

Each activation creates an immutable version snapshot containing:
- trigger_type, trigger_config, entry_conditions, re_enrollment_policy, timezone
- version_number (incrementing)
- published_at

### Behavior

- Customer A enrolled under v1 → continues v1 steps
- Automation edited and re-activated as v2 → new enrollments use v2
- Editing an active automation does NOT mutate running enrollments

### Table: `marketing_automation_steps`

Ordered steps within a version:
- position (0-indexed, unique per version)
- step_type: delay / condition / email
- config: JSONB (type-specific)

## Trigger Types

| Trigger | Type | Source |
|---------|------|--------|
| appointment_completed | Event | update-status-action.ts |
| referral_rewarded | Event | qualify-referral.ts |
| gift_card_purchased | Event | process-gift-card-webhook.ts |
| customer_inactive | Scheduled | Daily discovery via RPC |
| package_expiring | Scheduled | Daily discovery query |
| loyalty_threshold_reached | Event | (future wiring) |

### Event Triggers

Hooked into canonical domain services as non-blocking side effects:

```typescript
// Appointment completion (update-status-action.ts)
if (result.appointment.status === "completed") {
  try {
    await enrollCustomerForTrigger({...});
  } catch {
    // Never blocks appointment completion
  }
}
```

### Scheduled Triggers

Daily cron calls `POST /api/internal/automations/discover`:
- **customer_inactive**: Uses evaluate_segment_customers RPC, weekly cycle key prevents daily re-enrollment
- **package_expiring**: Queries customer_packages WHERE expires_at within N days, package.id as reference

Bounded: max 200 candidates per automation per discovery run.

## Enrollment

### Table: `marketing_automation_enrollments`

| Field | Notes |
|-------|-------|
| automation_id, version_id | References published version |
| customer_id | FK tenant_customers |
| status | active / waiting / completed / cancelled / failed |
| current_step_position | Current step index |
| next_run_at | When processor should wake this enrollment |
| trigger_reference_type/id | Source event for idempotency |

### Idempotency

- `once_per_trigger`: UNIQUE(automation_id, customer_id, trigger_reference_id)
- `once_ever`: UNIQUE(automation_id, customer_id)
- Duplicate constraint violation (23505) = idempotent success

### Re-enrollment Cycles

For `customer_inactive`:
- Weekly cycle key: `{automation_id}:{year}-W{week}`
- Customer becomes active again (new appointment) → new inactivity cycle later → eligible for re-enrollment

## Step Types

### Delay

```json
{ "value": 2, "unit": "days" }
```

Calculates absolute `next_run_at` at enrollment/advancement time. Processor only executes when `next_run_at <= NOW()`.

### Condition

```json
{ "field": "has_upcoming_appointment", "operator": "is_false", "value": true }
```

- Reuses the segmentation field registry (`ruleGroupToSQL`)
- Evaluates **CURRENT** customer state (not enrollment-time state)
- Condition true → continue
- Condition false → journey ends (no branching in v1)

### Email

```json
{ "subject": "...", "content": "...", "cta_text": "...", "cta_url": "..." }
```

- Marketing eligibility checked before dispatch
- Rendered via `renderCampaignEmail()` (published branding, unsubscribe link)
- Delivered via `getEmailProvider().send()` with idempotencyKey

## Step Processing

### Processor Route

`POST /api/internal/automations/process` (every 1-2 minutes)

### Flow

1. Claim due enrollments via `claim_due_automation_enrollments` RPC (FOR UPDATE SKIP LOCKED)
2. Load version steps for enrollment
3. Execute current step
4. Record execution in `marketing_automation_step_executions`
5. Advance to next step or complete

### Batch Size

50 enrollments per processor invocation.

### Crash Recovery

- Step executions recorded with UNIQUE(enrollment_id, execution_key)
- Email delivery uses idempotencyKey `automation:{enrollment_id}:step:{step_id}`
- Worker crash after email queued but before advancement → retry finds execution already recorded → skips email, advances

## Marketing Eligibility

Before EVERY email step dispatch:

```typescript
const { eligible } = await isCustomerMarketingEligible(tenantId, customerId, "email");
if (!eligible) → skip email step, continue journey
```

Late opt-out is respected. Stale consent is never used.

## Failure Handling

- Individual step failure → enrollment marked as `failed`
- Email delivery failure → step recorded as `failed`, enrollment fails
- Domain event hook failure → domain action completes normally (non-blocking)
- Processor crash → next run re-claims due enrollments safely

## Pause Semantics

- **Paused**: No new enrollments accepted, existing waiting enrollments remain but are NOT processed
- **Resume**: Existing due enrollments continue from where they stopped
- Enrollments are NOT cancelled automatically on pause

## UI

| Route | Purpose |
|-------|---------|
| `/{slug}/automations` | Dashboard — metrics, automation table |
| `/{slug}/automations/new` | Builder — trigger, steps, flow preview |
| `/{slug}/automations/{id}` | Detail — flow, enrollments, actions |
| `/{slug}/automations/{id}/edit` | Edit draft name/trigger |

## Server Logging

Events: automation.create, automation.update, automation.activate, automation.pause, automation.resume, automation.archive

Never logged: email content, customer email, tokens.

## Performance

- Event triggers: O(1) per domain event (query active automations for trigger type)
- Scheduled discovery: bounded 200 candidates per automation per run
- Processor: 50 enrollments per batch, FOR UPDATE SKIP LOCKED
- Step execution: UNIQUE constraint prevents duplicate work
- Enrollment indexes: partial index on (status, next_run_at) for due work

## Deferred

- customer_birthday trigger (no date_of_birth field in schema)
- customer_created trigger (no clear canonical hook)
- loyalty_threshold_reached (requires wiring loyalty award service)
- Multi-branch condition trees
- A/B testing within automations
- Manual bulk enrollment
- Visual drag-and-drop canvas builder
