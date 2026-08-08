import { describe, it, expect } from "vitest";
import { checkRateLimit, buildRateLimitKey } from "../rate-limiter";
import type { RateLimitConfig } from "../rate-limiter";

describe("checkRateLimit", () => {
  const config: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 60_000, // 1 minute
  };

  it("allows requests within limit", () => {
    const key = `test-allow-${Date.now()}`;
    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);

    const r4 = checkRateLimit(key, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetAt).toBeGreaterThan(Date.now());
  });

  it("different keys are independent", () => {
    const keyA = `test-isolate-a-${Date.now()}`;
    const keyB = `test-isolate-b-${Date.now()}`;

    checkRateLimit(keyA, config);
    checkRateLimit(keyA, config);
    checkRateLimit(keyA, config);

    // Key B should still be allowed
    const result = checkRateLimit(keyB, config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("returns resetAt timestamp in the future", () => {
    const key = `test-reset-${Date.now()}`;
    const result = checkRateLimit(key, config);
    expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
  });
});

describe("buildRateLimitKey", () => {
  it("builds key with tenant, ip, and route", () => {
    const key = buildRateLimitKey("my-business", "192.168.1.1", "availability");
    expect(key).toBe("my-business:192.168.1.1:availability");
  });

  it("isolates different tenants", () => {
    const k1 = buildRateLimitKey("tenant-a", "1.2.3.4", "booking");
    const k2 = buildRateLimitKey("tenant-b", "1.2.3.4", "booking");
    expect(k1).not.toBe(k2);
  });

  it("isolates different IPs for same tenant", () => {
    const k1 = buildRateLimitKey("tenant-a", "1.2.3.4", "booking");
    const k2 = buildRateLimitKey("tenant-a", "5.6.7.8", "booking");
    expect(k1).not.toBe(k2);
  });
});
