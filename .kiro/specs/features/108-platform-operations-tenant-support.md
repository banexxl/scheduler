# 108 — Platform Operations, Tenant Support & Admin Tooling

> Milestone 15.11

## Overview

Platform-operations layer for supporting tenants in production. Explicit support sessions, feature kill switches, processor health monitoring, and operational backlog visibility.

## Support Sessions

- **Table:** `platform_support_sessions`
- **Duration:** 30 minutes default, auto-expires
- **Requires:** platform admin + non-empty reason (min 5 chars)
- **Visual:** Persistent yellow SUPPORT MODE banner on tenant detail page
- **Identity:** Platform admin identity preserved — no impersonation
- **Audit:** Start/end logged via server action logger
- **Scope:** Session authorizes only the specific tenant

## Feature Overrides (Kill Switches)

- **Table:** `platform_tenant_feature_overrides`
- **Features:** public_booking, online_payments, gift_cards, referrals, campaigns, automations, imports
- **UNIQUE:** (tenant_id, feature) — one override per feature per tenant
- **Resolution:** Override > Tenant Setting. Expired overrides ignored.
- **Expiry:** Optional — if set, override stops applying after expiry without cron cleanup
- **Audit:** Create/remove logged with reason

### Resolution Logic

```
resolveEffectiveFeatureState(tenantId, feature):
  1. Query platform_tenant_feature_overrides WHERE tenant_id AND feature
  2. If found AND not expired → override.enabled
  3. If not found OR expired → tenant_setting (default: enabled)
```

## Processor Health

- **Table:** `platform_processor_runs` (generic run history)
- **Tracked processors:** notifications, reminders, campaigns, automations_process, automations_discover, imports, reconciliation, payment_expiry
- **Expected cadence:** Per-processor (5 min for frequent, 1440 min for daily)
- **Staleness:** If last_success > 2x expected cadence → "stale"
- **Failing:** If last_failure more recent than last_success

## Backlog Visibility

Bounded COUNT queries for:
- Pending notification outbox
- Scheduled campaigns past due
- Due automation enrollments
- Pending import rows
- Failed webhooks
- Stale payment intents

## Tenant Support Workspace

**Route:** `/platform/tenants/{tenantId}`

Sections:
- Tenant identity + status
- Support session banner
- Metrics (members, locations, resources, services, customers)
- Support actions (start/end session)
- Feature overrides table
- Recent operational events (server_logs timeline)

## Operations Dashboard

**Route:** `/platform/operations`

Shows:
- Processor health summary (healthy/stale/failing counts)
- Operational backlog metrics
- Processor table (name, status, last success, duration, processed count)

## Authorization

- All platform routes require `requirePlatformAdmin()`
- Platform admin = row in `platform_admins` table with `is_active = true`
- Enforced at layout level (`app/platform/layout.tsx`)
- Support sessions validated server-side (platform_user_id + tenant_id + active + not expired)
- Service role used for operational queries (server_logs has no client RLS)

## Security

- No silent impersonation
- No payment fabrication
- No gift-card balance mutation
- No webhook payload injection
- No production secret viewing
- Server logs remain redacted (safe_data only)
- Correlation IDs available for diagnosis
- No generic SQL/DB editor

## Deferred

- Correlation ID grouped timeline view
- Webhook inspection/retry UI
- Campaign/automation/import retry buttons
- Reconciliation retry action
- Server log viewer page with filters
- Support session tenant-scoped read access to business pages
- Support operator notes
- Global platform search
- Processor run recording (tables exist, recording integration deferred)
