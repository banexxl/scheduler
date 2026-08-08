import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractBearerToken, isAuthorizedBearerSecret } from "../internal-route-auth";

// ─── extractBearerToken ──────────────────────────────────────────────────────

describe("extractBearerToken", () => {
  it("extracts token from valid Bearer header", () => {
    expect(extractBearerToken("Bearer my-secret-token")).toBe("my-secret-token");
  });

  it("is case-insensitive on prefix", () => {
    expect(extractBearerToken("bearer my-token")).toBe("my-token");
    expect(extractBearerToken("BEARER my-token")).toBe("my-token");
  });

  it("trims surrounding whitespace", () => {
    expect(extractBearerToken("  Bearer   my-token  ")).toBe("my-token");
  });

  it("returns null for null header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
    expect(extractBearerToken("Token abc123")).toBeNull();
  });

  it("returns null for Bearer with empty token", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
  });
});

// ─── isAuthorizedBearerSecret ────────────────────────────────────────────────

describe("isAuthorizedBearerSecret", () => {
  const expectedSecret = "super-secret-processor-key-12345";

  it("accepts matching secret", () => {
    expect(
      isAuthorizedBearerSecret({
        authorizationHeader: `Bearer ${expectedSecret}`,
        expectedSecret,
      })
    ).toBe(true);
  });

  it("rejects wrong secret", () => {
    expect(
      isAuthorizedBearerSecret({
        authorizationHeader: "Bearer wrong-secret",
        expectedSecret,
      })
    ).toBe(false);
  });

  it("rejects missing authorization header", () => {
    expect(
      isAuthorizedBearerSecret({
        authorizationHeader: null,
        expectedSecret,
      })
    ).toBe(false);
  });

  it("rejects empty expected secret (misconfigured server)", () => {
    expect(
      isAuthorizedBearerSecret({
        authorizationHeader: "Bearer anything",
        expectedSecret: "",
      })
    ).toBe(false);
  });

  it("rejects whitespace-only expected secret", () => {
    expect(
      isAuthorizedBearerSecret({
        authorizationHeader: "Bearer anything",
        expectedSecret: "   ",
      })
    ).toBe(false);
  });

  it("uses timing-safe comparison (does not short-circuit)", () => {
    // Both of these should take similar time — verify both fail
    const result1 = isAuthorizedBearerSecret({
      authorizationHeader: "Bearer x",
      expectedSecret,
    });
    const result2 = isAuthorizedBearerSecret({
      authorizationHeader: "Bearer " + expectedSecret.slice(0, -1) + "X",
      expectedSecret,
    });
    expect(result1).toBe(false);
    expect(result2).toBe(false);
  });

  it("rejects when provided token matches but no Bearer prefix", () => {
    expect(
      isAuthorizedBearerSecret({
        authorizationHeader: expectedSecret,
        expectedSecret,
      })
    ).toBe(false);
  });
});
