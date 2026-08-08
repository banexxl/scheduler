/**
 * Authorization Error Types — Milestone 10.1.
 *
 * Standardized internal error classes for authorization failures.
 * These are never exposed publicly — they are caught by server code
 * and mapped to safe user-facing behavior (redirect, notFound, or generic message).
 */

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class TenantAccessDeniedError extends Error {
  readonly code = "TENANT_ACCESS_DENIED" as const;
  constructor(message = "Access to this business is denied") {
    super(message);
    this.name = "TenantAccessDeniedError";
  }
}

export class CustomerLinkRequiredError extends Error {
  readonly code = "CUSTOMER_LINK_REQUIRED" as const;
  constructor(message = "Active business link required") {
    super(message);
    this.name = "CustomerLinkRequiredError";
  }
}

export class ResourceNotFoundError extends Error {
  readonly code = "RESOURCE_NOT_FOUND" as const;
  constructor(message = "Resource not found") {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}
