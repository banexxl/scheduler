import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { redactSensitiveData, resolveRequestId, generateOperationId } from "../logger";

// ─── Redaction ───────────────────────────────────────────────────────────────

describe("redactSensitiveData", () => {
  it("redacts password field", () => {
    const result = redactSensitiveData({ password: "secret123", name: "test" });
    expect(result.password).toBe("[REDACTED]");
    expect(result.name).toBe("test");
  });

  it("redacts token field", () => {
    const result = redactSensitiveData({ token: "abc.def.ghi" });
    expect(result.token).toBe("[REDACTED]");
  });

  it("redacts authorization header", () => {
    const result = redactSensitiveData({ authorization: "Bearer xyz" });
    expect(result.authorization).toBe("[REDACTED]");
  });

  it("redacts cookie field", () => {
    const result = redactSensitiveData({ cookie: "session=abc123" });
    expect(result.cookie).toBe("[REDACTED]");
  });

  it("redacts api_key and apiKey variants", () => {
    const result = redactSensitiveData({ api_key: "key1", apiKey: "key2" });
    expect(result.api_key).toBe("[REDACTED]");
    expect(result.apiKey).toBe("[REDACTED]");
  });

  it("redacts access_token and refresh_token", () => {
    const result = redactSensitiveData({
      access_token: "at_xyz",
      refresh_token: "rt_xyz",
    });
    expect(result.access_token).toBe("[REDACTED]");
    expect(result.refresh_token).toBe("[REDACTED]");
  });

  it("redacts webhook_secret and service_role_key", () => {
    const result = redactSensitiveData({
      webhook_secret: "whsec_123",
      service_role_key: "sbp_key",
    });
    expect(result.webhook_secret).toBe("[REDACTED]");
    expect(result.service_role_key).toBe("[REDACTED]");
  });

  it("redacts encryption_key", () => {
    const result = redactSensitiveData({ encryption_key: "32bytesofkey" });
    expect(result.encryption_key).toBe("[REDACTED]");
  });

  it("preserves safe fields", () => {
    const result = redactSensitiveData({
      tenantId: "uuid-123",
      operation: "create",
      status: "ok",
      count: 5,
    });
    expect(result.tenantId).toBe("uuid-123");
    expect(result.operation).toBe("create");
    expect(result.status).toBe("ok");
    expect(result.count).toBe(5);
  });

  it("truncates very long strings", () => {
    const longString = "x".repeat(250);
    const result = redactSensitiveData({ description: longString });
    expect((result.description as string).length).toBeLessThan(250);
    expect((result.description as string)).toContain("...[truncated]");
  });

  it("does not truncate normal-length strings", () => {
    const result = redactSensitiveData({ name: "Normal name" });
    expect(result.name).toBe("Normal name");
  });
});

// ─── Request ID ──────────────────────────────────────────────────────────────

describe("resolveRequestId", () => {
  it("accepts valid incoming request ID", () => {
    const id = resolveRequestId("req-abc-123");
    expect(id).toBe("req-abc-123");
  });

  it("accepts UUIDs", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(resolveRequestId(uuid)).toBe(uuid);
  });

  it("accepts dotted IDs", () => {
    expect(resolveRequestId("trace.span.123")).toBe("trace.span.123");
  });

  it("rejects null and generates new ID", () => {
    const id = resolveRequestId(null);
    expect(id).toMatch(/^op_/);
  });

  it("rejects oversized IDs (>64 chars)", () => {
    const longId = "a".repeat(65);
    const id = resolveRequestId(longId);
    expect(id).toMatch(/^op_/);
    expect(id).not.toBe(longId);
  });

  it("rejects IDs with invalid characters", () => {
    const id = resolveRequestId("id with spaces");
    expect(id).toMatch(/^op_/);
  });

  it("rejects script injection attempts", () => {
    const id = resolveRequestId("<script>alert(1)</script>");
    expect(id).toMatch(/^op_/);
  });
});

// ─── Operation ID Generation ─────────────────────────────────────────────────

describe("generateOperationId", () => {
  it("starts with op_ prefix", () => {
    const id = generateOperationId();
    expect(id).toMatch(/^op_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateOperationId()));
    expect(ids.size).toBe(100);
  });

  it("is reasonable length", () => {
    const id = generateOperationId();
    expect(id.length).toBeGreaterThan(10);
    expect(id.length).toBeLessThan(40);
  });
});
