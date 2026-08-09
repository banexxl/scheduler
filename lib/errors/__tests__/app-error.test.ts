import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalProviderError,
  DatabaseError,
  ConfigurationError,
  toPublicError,
  isExpectedError,
  mapDatabaseError,
} from "../app-error";

// ─── Error Classes ───────────────────────────────────────────────────────────

describe("typed application errors", () => {
  it("ValidationError has correct category and safe message", () => {
    const err = new ValidationError("email format invalid");
    expect(err.category).toBe("VALIDATION");
    expect(err.statusCode).toBe(400);
    expect(err.safeMessage).toBe("Please check the information and try again.");
    expect(err.message).toBe("email format invalid");
    expect(err).toBeInstanceOf(AppError);
  });

  it("AuthenticationError defaults to 401", () => {
    const err = new AuthenticationError();
    expect(err.category).toBe("AUTHENTICATION");
    expect(err.statusCode).toBe(401);
  });

  it("AuthorizationError defaults to 403", () => {
    const err = new AuthorizationError();
    expect(err.category).toBe("AUTHORIZATION");
    expect(err.statusCode).toBe(403);
  });

  it("NotFoundError defaults to 404", () => {
    const err = new NotFoundError();
    expect(err.category).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
  });

  it("ConflictError defaults to 409", () => {
    const err = new ConflictError("slot taken");
    expect(err.category).toBe("CONFLICT");
    expect(err.statusCode).toBe(409);
  });

  it("RateLimitError defaults to 429", () => {
    const err = new RateLimitError();
    expect(err.category).toBe("RATE_LIMITED");
    expect(err.statusCode).toBe(429);
  });

  it("ExternalProviderError defaults to 502", () => {
    const err = new ExternalProviderError("SMTP timeout");
    expect(err.category).toBe("EXTERNAL_PROVIDER");
    expect(err.statusCode).toBe(502);
  });

  it("DatabaseError defaults to 500", () => {
    const err = new DatabaseError("connection refused");
    expect(err.category).toBe("DATABASE");
    expect(err.statusCode).toBe(500);
  });

  it("ConfigurationError defaults to 503", () => {
    const err = new ConfigurationError("SMTP_HOST not set");
    expect(err.category).toBe("CONFIGURATION");
    expect(err.statusCode).toBe(503);
  });
});

// ─── Public Error Mapping ────────────────────────────────────────────────────

describe("toPublicError", () => {
  it("maps AppError to safe message", () => {
    const err = new DatabaseError("pg connection pool exhausted");
    const pub = toPublicError(err, "ref-123");
    expect(pub.error).toBe("Something went wrong. Please try again.");
    expect(pub.code).toBe("DATABASE");
    expect(pub.referenceId).toBe("ref-123");
    // Internal message NOT exposed
    expect(pub.error).not.toContain("pg connection");
  });

  it("maps Yup ValidationError to safe message", () => {
    const err = new Error("name is required");
    err.name = "ValidationError";
    const pub = toPublicError(err);
    expect(pub.error).toBe("Please check the information and try again.");
    expect(pub.code).toBe("VALIDATION");
  });

  it("maps unknown error to generic message", () => {
    const pub = toPublicError(new Error("random crash"), "ref-456");
    expect(pub.error).toBe("Something went wrong. Please try again.");
    expect(pub.code).toBe("INTERNAL");
    expect(pub.referenceId).toBe("ref-456");
  });

  it("never exposes stack trace or internal message", () => {
    const err = new Error("SELECT * FROM users WHERE password = ...");
    const pub = toPublicError(err);
    expect(pub.error).not.toContain("SELECT");
    expect(pub.error).not.toContain("password");
  });
});

// ─── Expected vs Unexpected ──────────────────────────────────────────────────

describe("isExpectedError", () => {
  it("validation is expected", () => {
    expect(isExpectedError(new ValidationError("bad input"))).toBe(true);
  });

  it("authentication is expected", () => {
    expect(isExpectedError(new AuthenticationError())).toBe(true);
  });

  it("authorization is expected", () => {
    expect(isExpectedError(new AuthorizationError())).toBe(true);
  });

  it("not-found is expected", () => {
    expect(isExpectedError(new NotFoundError())).toBe(true);
  });

  it("conflict is expected", () => {
    expect(isExpectedError(new ConflictError("duplicate"))).toBe(true);
  });

  it("rate limit is expected", () => {
    expect(isExpectedError(new RateLimitError())).toBe(true);
  });

  it("database error is unexpected", () => {
    expect(isExpectedError(new DatabaseError("timeout"))).toBe(false);
  });

  it("external provider error is unexpected", () => {
    expect(isExpectedError(new ExternalProviderError("SMTP"))).toBe(false);
  });

  it("configuration error is unexpected", () => {
    expect(isExpectedError(new ConfigurationError("missing"))).toBe(false);
  });

  it("generic Error is unexpected", () => {
    expect(isExpectedError(new Error("random"))).toBe(false);
  });

  it("Yup ValidationError is expected", () => {
    const err = new Error("field required");
    err.name = "ValidationError";
    expect(isExpectedError(err)).toBe(true);
  });
});

// ─── Database Error Mapping ──────────────────────────────────────────────────

describe("mapDatabaseError", () => {
  it("maps unique violation (23505) to ConflictError", () => {
    const err = mapDatabaseError({ code: "23505", message: "duplicate key" });
    expect(err).toBeInstanceOf(ConflictError);
    expect(err.safeMessage).toBe("This item already exists.");
  });

  it("maps exclusion constraint (23P01) to ConflictError", () => {
    const err = mapDatabaseError({ code: "23P01", message: "exclusion" });
    expect(err).toBeInstanceOf(ConflictError);
  });

  it("maps foreign key violation (23503) to ValidationError", () => {
    const err = mapDatabaseError({ code: "23503", message: "fk violation" });
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("maps check constraint (23514) to ValidationError", () => {
    const err = mapDatabaseError({ code: "23514", message: "check" });
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("maps insufficient privilege (42501) to AuthorizationError", () => {
    const err = mapDatabaseError({ code: "42501", message: "permission" });
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it("maps unknown code to DatabaseError", () => {
    const err = mapDatabaseError({ code: "99999", message: "unknown" });
    expect(err).toBeInstanceOf(DatabaseError);
  });
});
