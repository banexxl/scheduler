import { describe, it, expect } from "vitest";
import { toSafeData } from "../server-action-logger";

/**
 * Server Action Logger Unit Tests — Milestone 13.2.
 *
 * Tests:
 * - Safe data serialization
 * - PII filtering
 * - Secret redaction
 * - Size limits
 * - Null/undefined handling
 */

describe("toSafeData", () => {
  it("returns empty object for null/undefined", () => {
    expect(toSafeData(null)).toEqual({});
    expect(toSafeData(undefined)).toEqual({});
  });

  it("converts primitive to value key", () => {
    expect(toSafeData("hello")).toEqual({ value: "hello" });
    expect(toSafeData(42)).toEqual({ value: "42" });
  });

  it("passes safe object keys through", () => {
    const result = toSafeData({ appointmentId: "abc-123", status: "cancelled" });
    expect(result.appointmentId).toBe("abc-123");
    expect(result.status).toBe("cancelled");
  });

  it("filters PII keys", () => {
    const result = toSafeData({
      appointmentId: "abc",
      email: "customer@example.com",
      phone: "+1234567890",
      customer_email: "secret@test.com",
      customer_name: "John Doe",
      customer_phone: "+9876",
      notes: "Internal private note",
      address: "123 Main St",
    });

    expect(result.appointmentId).toBe("abc");
    expect(result).not.toHaveProperty("email");
    expect(result).not.toHaveProperty("phone");
    expect(result).not.toHaveProperty("customer_email");
    expect(result).not.toHaveProperty("customer_name");
    expect(result).not.toHaveProperty("customer_phone");
    expect(result).not.toHaveProperty("notes");
    expect(result).not.toHaveProperty("address");
  });

  it("redacts sensitive keys (password, token, secret)", () => {
    const result = toSafeData({
      password: "super-secret",
      token: "jwt.token.here",
      secret: "my-secret",
      apiKey: "ak_12345",
      id: "safe-id",
    });

    expect(result.password).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect(result.secret).toBe("[REDACTED]");
    expect(result.id).toBe("safe-id");
  });

  it("truncates long string values", () => {
    const longValue = "a".repeat(200);
    const result = toSafeData({ description: longValue });
    expect(String(result.description).length).toBeLessThan(150);
    expect(String(result.description)).toContain("[truncated]");
  });

  it("limits to 10 keys maximum", () => {
    const input: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      input[`key${i}`] = `value${i}`;
    }
    const result = toSafeData(input);
    expect(Object.keys(result).length).toBeLessThanOrEqual(10);
  });

  it("does not persist authorization header", () => {
    const result = toSafeData({
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9...",
      requestId: "req-123",
    });
    expect(result.authorization).toBe("[REDACTED]");
    expect(result.requestId).toBe("req-123");
  });

  it("does not persist cookie values", () => {
    const result = toSafeData({
      cookie: "session=abc123; path=/",
      status: "ok",
    });
    expect(result.cookie).toBe("[REDACTED]");
    expect(result.status).toBe("ok");
  });

  it("does not persist webhook_secret", () => {
    const result = toSafeData({
      webhook_secret: "whsec_test_12345",
      event_type: "order.paid",
    });
    expect(result.webhook_secret).toBe("[REDACTED]");
    expect(result.event_type).toBe("order.paid");
  });
});
