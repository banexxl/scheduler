# Server Action Logging — Milestone 13.2

## Architecture

Two separate concerns:

| Concept | Table | Purpose |
|---|---|---|
| **Audit logs** | `tenant_deletion_events` (+ future `audit_logs`) | Security/business mutation history |
| **Server logs** | `server_logs` | Operational server diagnostics |

They are NOT mixed. Audit = what happened. Logs = how it performed.

---

## Logger Hierarchy

```text
lib/logging/logger.ts          ← Centralized console logger (Milestone 10.3)
lib/logging/server-action-logger.ts  ← Server action logger (Milestone 13.2)
                                         ├── console output (via logger.ts)
                                         └── DB persistence (server_logs, best-effort)
```

---

## Usage

### Wrapper Pattern (recommended for simple actions)

```typescript
import { withServerActionLogging } from "@/lib/logging/server-action-logger";

export async function myAction(tenantSlug: string): Promise<Result> {
  return withServerActionLogging(
    { action: "services.create", tenantId, userId },
    async (log) => {
      log.info("validating input");
      // ... do work ...
      return { success: true, serviceId: data.id };
    }
  );
}
```

### Instance Pattern (for complex flows)

```typescript
import { createServerActionLogger } from "@/lib/logging/server-action-logger";

const log = createServerActionLogger({
  action: "appointments.cancel",
  tenantId: tenant.id,
  userId: user.id,
});

try {
  // ... do work ...
  await log.success({ appointmentId });
} catch (error) {
  await log.failure(error);
  throw error;
}
```

---

## Action Names

Stable, dotted names:

```text
appointments.create
appointments.cancel
appointments.reschedule
appointments.update_status
services.create
services.update
services.delete
locations.create
locations.update
team.invite
team.remove_member
payments.refund
payments.create_checkout
packages.assign
packages.purchase
loyalty.award
loyalty.adjust
reviews.submit
waitlist.join
tenant.delete_permanently
tenant.deletion_preview
```

---

## Console Output

### Development

```text
[DEBUG] appointments.cancel.started | op=appointments.cancel tenant=77a10930
[INFO] appointments.cancel.success | op=appointments.cancel tenant=77a10930 54ms
```

### Production (JSON)

```json
{"level":"info","event":"appointments.cancel.success","timestamp":"2026-08-06T15:00:00Z","env":"production","context":{"operation":"appointments.cancel","tenantId":"77a10930-...","durationMs":54,"requestId":"op_m2k..."}}
```

---

## Database Schema (`server_logs`)

```sql
id UUID PRIMARY KEY
tenant_id UUID NULL
user_id UUID NULL
request_id TEXT NULL
level TEXT NOT NULL  -- debug|info|warn|error
source TEXT NOT NULL -- server_action|service|rpc|internal_job|webhook|system
action TEXT NOT NULL -- stable action name
status TEXT NOT NULL -- started|success|failure|validation_failed|unauthorized
message TEXT NULL
safe_data JSONB NOT NULL DEFAULT '{}'
duration_ms INTEGER NULL
error_code TEXT NULL
error_message TEXT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

---

## RLS

`server_logs` has RLS enabled with NO policies for authenticated/anon.
Only service-role can write/read. This is intentional.

---

## Safe Data Rules

### Never persist:

| Category | Examples |
|---|---|
| Passwords | password, secret, token, apiKey |
| Auth headers | authorization, cookie, session |
| Customer PII | email, phone, address, notes, customer_name |
| Full objects | Complete Supabase response rows |

### Safe to persist:

| Category | Examples |
|---|---|
| Record IDs | appointmentId, serviceId, locationId |
| Counts | rowCount, fieldCount |
| Status | operation result, error code |
| Performance | durationMs |
| Classification | reasonCode, eventType |

---

## Redaction

The `toSafeData()` function:
1. Removes PII keys (email, phone, address, notes, customer_*)
2. Redacts secrets (password, token, secret, authorization, cookie, apiKey, webhook_secret)
3. Truncates strings > 100 chars
4. Limits to 10 top-level keys

The underlying `redactSensitiveData()` from logger.ts handles the secret key matching.

---

## Request Correlation

Every logged action includes a `requestId` (generated via `generateOperationId()` or passed from context). This allows:

```text
Browser error → reference ID → console log → server_logs row
```

---

## Best-Effort Persistence

```typescript
async function persistServerLog(entry) {
  try {
    await supabase.from("server_logs").insert(entry);
  } catch {
    // Never fail the business operation
  }
}
```

If `server_logs` insert fails (DB down, constraint violation, etc.), the business action still succeeds. Console log is the fallback.

---

## Service-Role for Persistence

The logger uses `createServiceRoleClient()` because:
- Some actions run without auth context (workers, webhooks)
- `server_logs` has no client-facing RLS policies
- This is a legitimate service-role use (trusted backend diagnostic)

This does NOT weaken business authorization in any way.

---

## Retention

Recommended: 30–90 days.

Cleanup query:
```sql
DELETE FROM server_logs WHERE created_at < now() - interval '90 days';
```

Can be run as a scheduled processor or manual maintenance task.

---

## Instrumented Actions (Milestone 13.2)

| Domain | Actions |
|---|---|
| Appointments | cancel |
| Team | invite |
| Payments | refund |
| Tenant | delete_permanently, deletion_preview |

Remaining actions can be instrumented incrementally using the same patterns.

---

## Performance

Single `INSERT` into `server_logs` per action (~1-5ms). Not a bottleneck.
No batch writes needed for typical server action volume.
