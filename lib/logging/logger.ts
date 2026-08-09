import "server-only";

/**
 * Centralized Structured Logger — Milestone 10.3.
 *
 * Server-only logging utility with:
 * - Structured JSON output (production)
 * - Human-readable output (development)
 * - Automatic sensitive field redaction
 * - Request/operation correlation IDs
 * - Log levels: debug, info, warn, error
 * - PII-safe by default
 *
 * Does NOT introduce external vendors (Sentry, Datadog, etc.).
 * Emits to stdout/stderr for host capture.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = {
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
  [key: string]: unknown;
};

type LogEntry = {
  level: LogLevel;
  event: string;
  timestamp: string;
  env: string;
  context?: LogContext;
  error?: { message: string; name: string; stack?: string };
};

// ─── Configuration ───────────────────────────────────────────────────────────

const ENV = process.env.NODE_ENV ?? "development";
const IS_PRODUCTION = ENV === "production";
const IS_TEST = ENV === "test";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CONFIGURED_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (IS_PRODUCTION ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  if (IS_TEST) return level === "error"; // Only errors in test
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CONFIGURED_LEVEL];
}

// ─── Redaction ───────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "servicekey",
  "service_key",
  "servicerolekey",
  "service_role_key",
  "encryptionkey",
  "encryption_key",
  "webhooksecret",
  "webhook_secret",
  "smtp_pass",
  "smtppass",
]);

/**
 * Redacts sensitive fields from a context object (single depth).
 * Returns a new object with sensitive values replaced by "[REDACTED]".
 */
export function redactSensitiveData(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, "");
    if (SENSITIVE_KEYS.has(normalizedKey) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 200) {
      // Truncate very long strings that might contain encoded secrets
      result[key] = value.slice(0, 100) + "...[truncated]";
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function formatEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }

  // Development: human-readable
  const parts = [`[${entry.level.toUpperCase()}] ${entry.event}`];
  if (entry.context) {
    const { requestId, operation, tenantId, durationMs, ...rest } = entry.context;
    const meta: string[] = [];
    if (requestId) meta.push(`req=${requestId}`);
    if (operation) meta.push(`op=${operation}`);
    if (tenantId) meta.push(`tenant=${tenantId.slice(0, 8)}`);
    if (durationMs !== undefined) meta.push(`${durationMs}ms`);
    if (Object.keys(rest).length > 0) meta.push(JSON.stringify(rest));
    if (meta.length > 0) parts.push(meta.join(" "));
  }
  if (entry.error) {
    parts.push(`Error: ${entry.error.message}`);
  }
  return parts.join(" | ");
}

// ─── Core Logger ─────────────────────────────────────────────────────────────

function log(
  level: LogLevel,
  event: string,
  context?: LogContext,
  error?: unknown
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    env: ENV,
  };

  if (context) {
    entry.context = redactSensitiveData(context) as LogContext;
  }

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        name: error.name,
        stack: IS_PRODUCTION ? undefined : error.stack,
      };
    } else {
      entry.error = {
        message: String(error),
        name: "UnknownError",
      };
    }
  }

  const output = formatEntry(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const logger = {
  debug: (event: string, context?: LogContext) => log("debug", event, context),
  info: (event: string, context?: LogContext) => log("info", event, context),
  warn: (event: string, context?: LogContext, error?: unknown) =>
    log("warn", event, context, error),
  error: (event: string, context?: LogContext, error?: unknown) =>
    log("error", event, context, error),
};

// ─── Request ID Utilities ────────────────────────────────────────────────────

const REQUEST_ID_MAX_LENGTH = 64;
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_\-.:]+$/;

/**
 * Extracts or generates a request correlation ID.
 * Validates incoming x-request-id for safety.
 */
export function resolveRequestId(incomingHeader: string | null): string {
  if (
    incomingHeader &&
    incomingHeader.length <= REQUEST_ID_MAX_LENGTH &&
    REQUEST_ID_PATTERN.test(incomingHeader)
  ) {
    return incomingHeader;
  }
  return generateOperationId();
}

/**
 * Generates a short unique operation/request ID.
 */
export function generateOperationId(): string {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Operation Timing ────────────────────────────────────────────────────────

const SLOW_OPERATION_THRESHOLD_MS = 1000;

/**
 * Times an async operation and logs if slow.
 */
export async function withOperationTiming<T>(
  operation: string,
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    if (durationMs > SLOW_OPERATION_THRESHOLD_MS) {
      logger.warn("slow_operation", { ...context, operation, durationMs });
    }
    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    logger.error("operation_failed", { ...context, operation, durationMs }, error);
    throw error;
  }
}
