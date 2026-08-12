import "server-only";

import { logger, redactSensitiveData, generateOperationId } from "./logger";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Server Action Logger — Milestone 13.2.
 *
 * Extends the centralized logger (10.3) with:
 * - Structured action logging (started → success/failure)
 * - Database persistence to server_logs (best-effort)
 * - Safe result/error serialization
 * - Duration tracking
 * - Request correlation
 *
 * Usage:
 *   const log = createServerActionLogger({ action: 'services.create', tenantId, userId });
 *   try { ... await log.success({ serviceId }); }
 *   catch (e) { await log.failure(e); throw e; }
 *
 * Or wrapper:
 *   return withServerActionLogging({ action, tenantId, userId }, async () => { ... });
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServerLogLevel = "debug" | "info" | "warn" | "error";
export type ServerLogSource = "server_action" | "service" | "rpc" | "internal_job" | "webhook" | "system";
export type ServerLogStatus = "started" | "success" | "failure" | "validation_failed" | "unauthorized";

export type ServerActionLogContext = {
  action: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  source?: ServerLogSource;
};

export type SafeData = Record<string, unknown>;

// ─── Redaction for Results ───────────────────────────────────────────────────

const PII_KEYS = new Set([
  "email",
  "phone",
  "phonenumber",
  "phone_number",
  "address",
  "street",
  "notes",
  "internal_notes",
  "customer_email",
  "customer_phone",
  "customer_name",
]);

/**
 * Produces a safe serializable summary from action result data.
 * Strips PII, redacts secrets, truncates large values.
 * Returns at most 10 top-level keys.
 */
export function toSafeData(data: unknown): SafeData {
  if (data === null || data === undefined) return {};
  if (typeof data !== "object") return { value: String(data).slice(0, 200) };

  const obj = data as Record<string, unknown>;
  const redacted = redactSensitiveData(obj);
  const result: SafeData = {};
  let count = 0;

  for (const [key, value] of Object.entries(redacted)) {
    if (count >= 10) break;
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, "");
    if (PII_KEYS.has(normalizedKey) || PII_KEYS.has(key.toLowerCase())) {
      continue; // Skip PII entirely
    }
    if (typeof value === "string" && value.length > 100) {
      result[key] = value.slice(0, 80) + "...[truncated]";
    } else {
      result[key] = value;
    }
    count++;
  }

  return result;
}

// ─── Database Persistence (best-effort) ──────────────────────────────────────

async function persistServerLog(entry: {
  tenant_id?: string;
  user_id?: string;
  request_id?: string;
  level: ServerLogLevel;
  source: ServerLogSource;
  action: string;
  status: ServerLogStatus;
  message?: string;
  safe_data: SafeData;
  duration_ms?: number;
  error_code?: string;
  error_message?: string;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("server_logs").insert({
      tenant_id: entry.tenant_id || null,
      user_id: entry.user_id || null,
      request_id: entry.request_id || null,
      level: entry.level,
      source: entry.source,
      action: entry.action,
      status: entry.status,
      message: entry.message || null,
      safe_data: entry.safe_data as never,
      duration_ms: entry.duration_ms || null,
      error_code: entry.error_code || null,
      error_message: entry.error_message || null,
    });
  } catch {
    // Best-effort: never fail the business operation because of logging
    // Console fallback already happened via logger
  }
}

// ─── Logger Instance ─────────────────────────────────────────────────────────

export type ServerActionLoggerInstance = {
  /** Log success with optional safe result data */
  success: (safeResult?: SafeData, message?: string) => Promise<void>;
  /** Log failure from an error */
  failure: (error: unknown, safeContext?: SafeData) => Promise<void>;
  /** Log validation failure */
  validationFailed: (fieldErrors?: Record<string, string>) => Promise<void>;
  /** Log unauthorized access attempt */
  unauthorized: (message?: string) => Promise<void>;
  /** Log an informational message during the action */
  info: (message: string, data?: SafeData) => void;
};

/**
 * Creates a server action logger instance.
 * Starts timing immediately.
 */
export function createServerActionLogger(
  ctx: ServerActionLogContext
): ServerActionLoggerInstance {
  const startTime = performance.now();
  const requestId = ctx.requestId ?? generateOperationId();
  const source = ctx.source ?? "server_action";

  // Log start to console
  logger.debug(`${ctx.action}.started`, {
    operation: ctx.action,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    requestId,
  });

  return {
    async success(safeResult?: SafeData, message?: string) {
      const durationMs = Math.round(performance.now() - startTime);

      logger.info(`${ctx.action}.success`, {
        operation: ctx.action,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        requestId,
        durationMs,
      });

      await persistServerLog({
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        request_id: requestId,
        level: "info",
        source,
        action: ctx.action,
        status: "success",
        message,
        safe_data: safeResult ?? {},
        duration_ms: durationMs,
      });
    },

    async failure(error: unknown, safeContext?: SafeData) {
      const durationMs = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: string })?.code ?? undefined;

      logger.error(`${ctx.action}.failure`, {
        operation: ctx.action,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        requestId,
        durationMs,
        errorCategory: errorCode,
      }, error);

      await persistServerLog({
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        request_id: requestId,
        level: "error",
        source,
        action: ctx.action,
        status: "failure",
        message: errorMessage.slice(0, 1000),
        safe_data: safeContext ?? {},
        duration_ms: durationMs,
        error_code: errorCode?.slice(0, 64),
        error_message: errorMessage.slice(0, 2000),
      });
    },

    async validationFailed(fieldErrors?: Record<string, string>) {
      const durationMs = Math.round(performance.now() - startTime);

      logger.info(`${ctx.action}.validation_failed`, {
        operation: ctx.action,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        requestId,
        durationMs,
      });

      await persistServerLog({
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        request_id: requestId,
        level: "info",
        source,
        action: ctx.action,
        status: "validation_failed",
        safe_data: fieldErrors ? { fieldCount: Object.keys(fieldErrors).length } : {},
        duration_ms: durationMs,
      });
    },

    async unauthorized(message?: string) {
      const durationMs = Math.round(performance.now() - startTime);

      logger.warn(`${ctx.action}.unauthorized`, {
        operation: ctx.action,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        requestId,
        durationMs,
      });

      await persistServerLog({
        tenant_id: ctx.tenantId,
        user_id: ctx.userId,
        request_id: requestId,
        level: "warn",
        source,
        action: ctx.action,
        status: "unauthorized",
        message,
        safe_data: {},
        duration_ms: durationMs,
      });
    },

    info(message: string, data?: SafeData) {
      logger.info(`${ctx.action}: ${message}`, {
        operation: ctx.action,
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        requestId,
        ...data,
      });
    },
  };
}

// ─── Wrapper Pattern ─────────────────────────────────────────────────────────

/**
 * Wraps an async function with structured server action logging.
 * Automatically logs started/success/failure with duration.
 *
 * Usage:
 *   return withServerActionLogging(
 *     { action: 'services.create', tenantId, userId },
 *     async (log) => {
 *       // ... do work ...
 *       return { success: true, serviceId: data.id };
 *     }
 *   );
 */
export async function withServerActionLogging<T>(
  ctx: ServerActionLogContext,
  fn: (log: ServerActionLoggerInstance) => Promise<T>
): Promise<T> {
  const log = createServerActionLogger(ctx);

  try {
    const result = await fn(log);

    // Auto-log success if the function didn't explicitly call log.success
    const safeResult = toSafeData(result);
    await log.success(safeResult);

    return result;
  } catch (error) {
    await log.failure(error);
    throw error;
  }
}
