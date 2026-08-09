/**
 * Application Error System — Milestone 10.3.
 *
 * Typed error classes with categories, safe public messages,
 * and structured metadata. Integrates with the Milestone 10.1
 * auth errors but provides a broader error taxonomy.
 *
 * Internal errors carry diagnostic details.
 * Public error mapping strips internals for user-facing responses.
 */

// ─── Error Categories ────────────────────────────────────────────────────────

export type ErrorCategory =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "EXTERNAL_PROVIDER"
  | "DATABASE"
  | "CONFIGURATION"
  | "INTERNAL";

// ─── Base Application Error ──────────────────────────────────────────────────

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly statusCode: number;
  readonly safeMessage: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;

  constructor(params: {
    message: string;
    category: ErrorCategory;
    statusCode?: number;
    safeMessage?: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(params.message);
    this.name = "AppError";
    this.category = params.category;
    this.statusCode = params.statusCode ?? categoryToStatus(params.category);
    this.safeMessage = params.safeMessage ?? categoryToSafeMessage(params.category);
    this.details = params.details;
    this.cause = params.cause;
  }
}

// ─── Specific Error Classes ──────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      category: "VALIDATION",
      safeMessage: "Please check the information and try again.",
      details,
    });
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super({
      message,
      category: "AUTHENTICATION",
      safeMessage: "Please sign in to continue.",
    });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super({
      message,
      category: "AUTHORIZATION",
      safeMessage: "You don't have permission to do that.",
    });
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super({
      message,
      category: "NOT_FOUND",
      safeMessage: "The requested item could not be found.",
    });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, safeMessage?: string) {
    super({
      message,
      category: "CONFLICT",
      safeMessage: safeMessage ?? "This action conflicts with the current state. Please try again.",
    });
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded") {
    super({
      message,
      category: "RATE_LIMITED",
      statusCode: 429,
      safeMessage: "Too many requests. Please try again shortly.",
    });
    this.name = "RateLimitError";
  }
}

export class ExternalProviderError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      category: "EXTERNAL_PROVIDER",
      safeMessage: "A third-party service is temporarily unavailable. Please try again.",
      details,
    });
    this.name = "ExternalProviderError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: Error) {
    super({
      message,
      category: "DATABASE",
      safeMessage: "Something went wrong. Please try again.",
      cause,
    });
    this.name = "DatabaseError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super({
      message,
      category: "CONFIGURATION",
      statusCode: 503,
      safeMessage: "This service is not currently available.",
    });
    this.name = "ConfigurationError";
  }
}

// ─── Category Helpers ────────────────────────────────────────────────────────

function categoryToStatus(category: ErrorCategory): number {
  switch (category) {
    case "VALIDATION": return 400;
    case "AUTHENTICATION": return 401;
    case "AUTHORIZATION": return 403;
    case "NOT_FOUND": return 404;
    case "CONFLICT": return 409;
    case "RATE_LIMITED": return 429;
    case "EXTERNAL_PROVIDER": return 502;
    case "DATABASE": return 500;
    case "CONFIGURATION": return 503;
    case "INTERNAL": return 500;
    default: return 500;
  }
}

function categoryToSafeMessage(category: ErrorCategory): string {
  switch (category) {
    case "VALIDATION": return "Please check the information and try again.";
    case "AUTHENTICATION": return "Please sign in to continue.";
    case "AUTHORIZATION": return "You don't have permission to do that.";
    case "NOT_FOUND": return "The requested item could not be found.";
    case "CONFLICT": return "This action conflicts with the current state. Please try again.";
    case "RATE_LIMITED": return "Too many requests. Please try again shortly.";
    case "EXTERNAL_PROVIDER": return "A third-party service is temporarily unavailable. Please try again.";
    case "DATABASE": return "Something went wrong. Please try again.";
    case "CONFIGURATION": return "This service is not currently available.";
    case "INTERNAL": return "Something went wrong. Please try again.";
    default: return "Something went wrong. Please try again.";
  }
}

// ─── Public Error Mapping ────────────────────────────────────────────────────

export type PublicErrorResponse = {
  error: string;
  code?: string;
  referenceId?: string;
};

/**
 * Maps any error to a safe public response.
 * Never exposes internal messages, stack traces, or database details.
 */
export function toPublicError(
  error: unknown,
  referenceId?: string
): PublicErrorResponse {
  if (error instanceof AppError) {
    return {
      error: error.safeMessage,
      code: error.category,
      referenceId,
    };
  }

  // Known validation errors from Yup
  if (error instanceof Error && error.name === "ValidationError") {
    return {
      error: "Please check the information and try again.",
      code: "VALIDATION",
      referenceId,
    };
  }

  // Default: generic safe message
  return {
    error: "Something went wrong. Please try again.",
    code: "INTERNAL",
    referenceId,
  };
}

/**
 * Determines if an error is expected (user-caused) vs unexpected (system).
 * Expected errors are logged at info/warn, unexpected at error.
 */
export function isExpectedError(error: unknown): boolean {
  if (error instanceof AppError) {
    return ["VALIDATION", "AUTHENTICATION", "AUTHORIZATION", "NOT_FOUND", "CONFLICT", "RATE_LIMITED"].includes(error.category);
  }
  if (error instanceof Error && error.name === "ValidationError") {
    return true;
  }
  return false;
}

// ─── PostgreSQL Error Mapping ────────────────────────────────────────────────

/**
 * Maps known Supabase/PostgreSQL error codes to typed application errors.
 */
export function mapDatabaseError(pgError: { code?: string; message?: string }): AppError {
  const code = pgError.code ?? "";
  const message = pgError.message ?? "Database operation failed";

  // Unique violation
  if (code === "23505") {
    return new ConflictError(message, "This item already exists.");
  }

  // Exclusion constraint (scheduling conflicts)
  if (code === "23P01") {
    return new ConflictError(message, "This conflicts with an existing record.");
  }

  // Foreign key violation
  if (code === "23503") {
    return new ValidationError("Referenced item does not exist.");
  }

  // Check constraint
  if (code === "23514") {
    return new ValidationError("Value does not meet requirements.");
  }

  // Insufficient privilege
  if (code === "42501") {
    return new AuthorizationError("Access denied.");
  }

  return new DatabaseError(message);
}
