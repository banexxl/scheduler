# Observability, Error Handling & Operational Diagnostics

Milestone 10.3 — Completed August 2026.

---

## 1. Logging Architecture

### Module: `lib/logging/logger.ts`

Server-only structured logger with:

- **Production:** JSON output (stdout/stderr) for host log capture
- **Development:** Human-readable colored output
- **Test:** Only `error` level emitted (reduces noise)
- **No external vendor** — vendor-neutral foundation

### Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Developer diagnostics, verbose traces |
| `info` | Important operations, worker summaries |
| `warn` | Expected abnormal state, retries, rate limits, slow operations |
| `error` | Unexpected failures requiring investigation |

### API

```ts
import { logger } from "@/lib/logging";

logger.info("booking_created", { tenantId, requestId });
logger.error("smtp_send_failed", { tenantId, worker: "notifications" }, error);
```

---

## 2. Structured Log Context

Standard fields (all optional):

```ts
type LogContext = {
  requestId?: string;
  operation?: string;
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
  customerAccountId?: string;
  appointmentId?: string;
  worker?: string;
  route?: string;
  errorCategory?: string;
  durationMs?: number;
};
```

---

## 3. Sensitive Field Redaction

### Automatically redacted keys (case-insensitive, normalized):

- password, token, secret
- authorization, cookie
- api_key, apiKey
- access_token, refresh_token
- service_key, service_role_key
- encryption_key, webhook_secret
- smtp_pass

### Behavior:
- Single-depth object redaction
- Long strings (>200 chars) truncated
- Applied automatically to all log context

---

## 4. PII Policy

| Data | Logging Status |
|------|---------------|
| Tenant ID | Safe — logged |
| Appointment ID | Safe — logged |
| Customer Account ID | Safe — logged |
| Request/Operation ID | Safe — logged |
| Error codes | Safe — logged |
| Email addresses | Avoid — use IDs instead |
| Phone numbers | Avoid |
| Street addresses | Never |
| Internal/customer notes | Never |
| Tokens (any type) | Never (auto-redacted) |
| Secrets | Never (auto-redacted) |

---

## 5. Request Correlation

### Route Handlers

```ts
const requestId = resolveRequestId(request.headers.get("x-request-id"));
```

- Validates incoming `x-request-id` (alphanumeric + dashes, max 64 chars)
- Rejects injection attempts (HTML, spaces, oversized)
- Generates `op_` prefixed ID when invalid/missing

### Server Actions

```ts
const operationId = generateOperationId();
```

---

## 6. Error Taxonomy

### Module: `lib/errors/app-error.ts`

| Category | Status | Safe Message |
|----------|:------:|-------------|
| VALIDATION | 400 | Please check the information and try again. |
| AUTHENTICATION | 401 | Please sign in to continue. |
| AUTHORIZATION | 403 | You don't have permission to do that. |
| NOT_FOUND | 404 | The requested item could not be found. |
| CONFLICT | 409 | This action conflicts with the current state. |
| RATE_LIMITED | 429 | Too many requests. Please try again shortly. |
| EXTERNAL_PROVIDER | 502 | A third-party service is temporarily unavailable. |
| DATABASE | 500 | Something went wrong. Please try again. |
| CONFIGURATION | 503 | This service is not currently available. |
| INTERNAL | 500 | Something went wrong. Please try again. |

### Expected vs Unexpected

- **Expected** (info/warn): VALIDATION, AUTHENTICATION, AUTHORIZATION, NOT_FOUND, CONFLICT, RATE_LIMITED
- **Unexpected** (error): DATABASE, EXTERNAL_PROVIDER, CONFIGURATION, INTERNAL

---

## 7. Public Error Mapping

```ts
import { toPublicError } from "@/lib/errors";

const publicResponse = toPublicError(error, referenceId);
// { error: "Something went wrong.", code: "INTERNAL", referenceId: "op_..." }
```

Never exposes:
- Internal error messages
- Stack traces
- Database constraint names
- Provider error details

---

## 8. Database Error Mapping

```ts
import { mapDatabaseError } from "@/lib/errors";
```

| PG Code | Mapped To |
|---------|-----------|
| 23505 (unique) | ConflictError |
| 23P01 (exclusion) | ConflictError |
| 23503 (FK) | ValidationError |
| 23514 (check) | ValidationError |
| 42501 (privilege) | AuthorizationError |
| Other | DatabaseError |

---

## 9. Global Error Boundaries

| File | Purpose |
|------|---------|
| `app/error.tsx` | Catches route-level errors, shows retry button |
| `app/global-error.tsx` | Catches root layout errors, minimal HTML fallback |
| `app/not-found.tsx` | Global 404, enumeration-safe messaging |

All boundaries:
- Never expose stack traces
- Never reveal database/provider details
- Provide safe user-friendly messages
- Include retry/home navigation

---

## 10. Health & Readiness

| Endpoint | Purpose | DB Call |
|----------|---------|:------:|
| `GET /api/health` | Liveness probe | No |
| `GET /api/health/supabase` | Readiness probe | Yes (lightweight) |

Response:
```json
{ "status": "ok", "timestamp": "...", "version": "abc123" }
```

No secrets, no connection strings, no internal state exposed.

---

## 11. Configuration Validation

### Module: `lib/environment/validate-config.ts`

Categories:
- **Always required:** Supabase URL, publishable key, service role key
- **Feature-dependent:** SMTP, notification secret, Polar tokens, encryption key

Behavior:
- Missing required → logged at `error` level
- Partially configured features → logged at `warn` level
- Does not crash process for optional disabled features

---

## 12. Worker Diagnostics

Internal API routes now include:
- `requestId` in error responses
- Structured logging with worker context
- Safe summary responses (counts only, no customer data)

Example response:
```json
{ "processed": 10, "sent": 9, "failed": 1, "requestId": "op_..." }
```

---

## 13. Operation Timing

```ts
import { withOperationTiming } from "@/lib/logging";

const result = await withOperationTiming("analytics_query", { tenantId }, async () => {
  return getDashboardAnalytics(...);
});
```

- Logs warning if operation exceeds 1000ms
- Logs error on failure with duration
- Does not block execution

---

## 14. Console Audit Results

| Category | Count | Status |
|----------|:-----:|--------|
| Internal API route errors | 7 | Migrated to structured logger |
| Business action/service errors | ~30 | Already safe (no PII/secrets) — logger available for gradual adoption |
| Client-side console | 0 | None found |

All existing `console.error` calls verified to log only:
- Error messages (never raw SQL)
- Error codes
- Safe identifiers (tenant slug, IDs)
- No tokens, secrets, or customer PII

---

## 15. Remaining Observability Gaps

| Gap | Severity | Path |
|-----|----------|------|
| No distributed tracing | Medium | Add OpenTelemetry when vendor chosen |
| No alerting | Medium | Add when monitoring platform deployed |
| No metrics (counters/gauges) | Low | Add with observability vendor |
| Remaining console.error in services | Low | Gradual migration to logger |
| No query timing instrumentation | Low | Add withOperationTiming selectively |

---

## 16. Test Coverage

| Test File | Tests |
|-----------|:-----:|
| `lib/logging/__tests__/logger.test.ts` | 19 |
| `lib/errors/__tests__/app-error.test.ts` | 27 |
| **Total** | **46** |

Covers: redaction (10+ key patterns), request ID validation, operation ID generation, error classes, public error mapping, expected/unexpected classification, database error mapping.
