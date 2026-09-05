# Appointment Reminders

**Milestone 6.13**

## Overview

Scheduled email reminders sent before appointments. Uses a two-stage pipeline: reminder schedules determine **when** a notification becomes due, and the existing notification outbox handles **delivery and retry**.

## Architecture

```
tenant_reminder_rules     ← Admin configures offsets (24h, 2h, etc.)
         │
         ▼
appointment_reminders     ← Created per appointment+rule+version
         │
         ▼  (cron: /api/internal/reminders/process)
notification_outbox       ← Enqueued when scheduled_for <= now()
         │
         ▼  (cron: /api/internal/notifications/process)
SMTP Provider             ← Delivered via Nodemailer
```

## Reminder Rule Model

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → tenants |
| `name` | text | Human-readable label (1–120 chars) |
| `offset_minutes` | integer | Minutes before appointment start (5–525600) |
| `channel` | text | Currently `email` only |
| `is_active` | boolean | Enabled/disabled |
| `sort_order` | integer | Display ordering |

Unique constraint: `(tenant_id, channel, offset_minutes)` prevents duplicate effective offsets.

## Offset Semantics

```
scheduled_for = appointment.starts_at - offset_minutes
```

The calculation is instant-based (timestamptz subtraction) and DST-safe.

Examples:
- 1440 minutes = 24 hours before
- 120 minutes = 2 hours before  
- 10080 minutes = 7 days before

Offsets are always positive. Reminders after an appointment are not supported.

## Default Behavior

No reminder rules exist by default. Owners/admins explicitly create rules via the settings UI. Presets are offered (30min, 1h, 2h, 24h, 48h, 7d) but must be actively created.

This avoids unexpectedly sending messages to existing appointments after deployment.

## Reminder Schedule Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → tenants |
| `appointment_id` | uuid | FK → appointments |
| `reminder_rule_id` | uuid | FK → tenant_reminder_rules (RESTRICT) |
| `schedule_version` | integer | Matches appointment.schedule_version |
| `channel` | text | email |
| `scheduled_for` | timestamptz | When the reminder becomes due |
| `status` | text | pending/processing/enqueued/sent/cancelled/failed |
| `outbox_id` | uuid | FK → notification_outbox (nullable) |
| `claimed_at/by` | timestamptz/text | Worker claiming fields |
| `enqueued_at` | timestamptz | When outbox row was created |
| `sent_at` | timestamptz | When SMTP accepted |
| `cancelled_at` | timestamptz | When cancelled |
| `cancellation_reason` | text | Why cancelled |

Unique: `(tenant_id, appointment_id, reminder_rule_id, schedule_version)`

## Schedule Version Strategy

`appointments.schedule_version` is auto-incremented by a trigger when scheduling fields change:
- starts_at, ends_at
- service_id, location_id, resource_id
- duration_minutes, buffer_before_minutes, buffer_after_minutes

Customer detail changes, notes, and status-only updates do NOT increment the version.

This separates reminder generations across reschedules, allowing sent reminders to be preserved as history while new ones are created for the updated schedule.

## Appointment Creation Integration

After successful creation → `syncRemindersAfterCreation`:
1. Checks email notifications enabled
2. Checks customer email exists
3. Calls `sync_appointment_reminders` RPC
4. Creates reminder for each active rule where `scheduled_for > now()`
5. Non-blocking: appointment creation succeeds regardless

## Rescheduling Behavior

After scheduling fields change → `syncRemindersAfterReschedule`:
1. Trigger auto-increments `schedule_version`
2. Sync RPC cancels old-version pending reminders
3. Creates new reminders for current version
4. Past-time reminders are skipped
5. Sent reminders from previous versions remain as history

## Cancellation Behavior

After cancellation → `cancelRemindersAfterCancellation`:
1. Cancels all pending/processing/enqueued reminders
2. Cancels linked pending outbox rows
3. Sets `cancellation_reason = 'appointment_cancelled'`
4. Sent reminders preserved as history

## Status Eligibility

Eligible for reminders: `pending`, `confirmed`

Transitions to ineligible statuses (completed, no_show, checked_in, in_progress, cancelled) cancel pending reminders.

## Past Reminder Policy

Only reminders whose `scheduled_for > now()` are created. Already-passed reminder times are skipped during synchronization. No missed reminders are sent retroactively.

## Reminder-to-Outbox Pipeline

When `scheduled_for <= now()` and status is `pending`:
1. Claim via `claim_due_appointment_reminders` (FOR UPDATE SKIP LOCKED)
2. Verify appointment eligibility, schedule version, email, future start
3. Build immutable payload snapshot
4. Render template (uses `appointment_reminder` template type)
5. Enqueue to `notification_outbox` with deterministic idempotency key
6. Mark reminder as `enqueued` with `outbox_id`

## Idempotency

Key format: `appointment:{appointmentId}:reminder:{ruleId}:v{scheduleVersion}`

Deterministic per appointment+rule+version. Duplicate enqueue attempts link to existing outbox row.

## Claiming and Locking

- `claim_due_appointment_reminders` uses `FOR UPDATE SKIP LOCKED`
- Stale processing locks recovered after 10 minutes
- Max batch size: 50
- Appointment eligibility verified during claim (JOIN with appointments)
- Schedule version verified during claim

## Race Handling

| Race | Mitigation |
|------|-----------|
| Cancelled during processing | Re-checks eligibility before enqueue |
| Rescheduled while outbox pending | Cancel RPC cancels stale outbox rows |
| Rescheduled after SMTP starts | Narrow race — cannot recall after provider submission |
| Email changed | Future reminders use latest email at enqueue time |

## Customer Email Changes

- Pending reminder schedules remain (they don't store email)
- Email is resolved from appointment at enqueue time
- Already-enqueued outbox rows preserve their snapshot recipient
- Email removal makes appointment ineligible for new reminders (no email check at sync)

## Template Behavior

Template type: `appointment_reminder`

Additional variable: `{{reminder_offset}}` renders as "24 hours", "2 hours", "30 minutes", etc.

Templates are rendered at enqueue time (snapshot policy). Template changes affect future enqueues only.

## SMTP Provider Reuse

Reminders use the same Nodemailer SMTP provider, same outbox processing pipeline, same retry policy (5 attempts with exponential backoff). No provider-specific code in reminder modules.

## Time-Zone Semantics

- `scheduled_for` is computed from `starts_at` (timestamptz) minus offset — fully DST-safe
- Display times use tenant timezone via `Intl.DateTimeFormat`
- No browser timezone dependency
- No local string arithmetic

## Internal UI

### Settings page (`/{tenantSlug}/settings/notifications`)
- Reminder rules table with name, timing, channel, active toggle
- Add dialog with offset amount/unit selector and preset chips
- Edit, delete, enable/disable actions

### Appointment detail page
- Reminders section showing all schedule records
- Scheduled time, status, sent time
- Manual "Sync Reminders" button for admin diagnostics

## Backfill Behavior

`backfill_appointment_reminders` RPC:
- Bounded date range (max 90 days)
- Bounded batch (max 500 appointments)
- Only future eligible appointments with email
- Idempotent (unique constraint prevents duplicates)
- Available via admin action for newly-created rules

## Cron Requirements

Two cron jobs required (can share the same secret):

```
# Every 1–2 minutes: Convert due reminders into outbox records
POST /api/internal/reminders/process
Authorization: Bearer {NOTIFICATION_PROCESSOR_SECRET}

# Every 1–2 minutes: Send pending outbox records via SMTP
POST /api/internal/notifications/process
Authorization: Bearer {NOTIFICATION_PROCESSOR_SECRET}
```

Automatic reminders are NOT active unless both crons are configured.

## Security

- Public users cannot read reminder rules or records
- Processing routes require NOTIFICATION_PROCESSOR_SECRET
- Cross-tenant isolation via RLS and RPC validation
- Client cannot override scheduled_for or recipient
- Client cannot forge schedule_version
- SMTP credentials remain server-only
- Reminder payloads exclude internal notes

## Retry Responsibility Split

| Layer | Retries |
|-------|---------|
| Reminder scheduler | DB contention, temporary enqueue failure → releases back to pending |
| Notification outbox | SMTP failures, rate limits, timeouts → exponential backoff (5 attempts) |

Once an outbox row exists, the notification processor owns delivery.

## Deferred Features

Not implemented:
- SMS reminders
- Push notifications
- Customer self-service (cancel/reschedule links)
- Recurring appointments
- Custom customer timezone selection
- Provider delivery webhooks

## Manual Verification Steps

```bash
# 1. Apply migration
# supabase/migrations/20250805000018_appointment_reminders.sql

# 2. Regenerate database types
npm run db:types

# 3. Remove temporary "as never" type assertions

# 4. Configure SMTP and processor secrets (same as Milestone 6.12)

# 5. Configure reminder scheduler cron (every 1–2 minutes)
# POST /api/internal/reminders/process

# 6. Configure notification processor cron (every 1–2 minutes)
# POST /api/internal/notifications/process

# 7. Create reminder rules via settings UI

# 8. Verify
npm run lint
npm run type-check
npm run test
npm run build
```

## Assumptions

- Milestone 6.12 notification infrastructure is deployed and operational
- `update_updated_at_column()` trigger function exists
- Appointments table has `starts_at` as timestamptz
- Tenant table has `default_timezone`
- `createAdminClient()` bypasses RLS
- No real-time delivery — batch processing with 1–2 minute cadence
