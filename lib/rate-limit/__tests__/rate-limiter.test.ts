import { describe, it, expect } from "vitest";
import {
  checkRateLimit,
  buildRateLimitKey,
  RATE_LIMIT_AVAILABILITY,
  RATE_LIMIT_BOOKING,
} from "../rate-limiter";

describe("checkRateLimit", () => {
  const testConfig = { maxRequests: 3, windowMs: 60_000 };

  it("allows first request", () => {
    const key = `test-${Date.now()}-first`;
    const result = checkRateLimit(key, testConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows requests up to limit", () => {
    const key = `test-${Date.now()}-upto`;
    checkRateLimit(key, testConfig);
    checkRateLimit(key, testConfig);
    const result = checkRateLimit(key, testConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("rejects requests beyond limit", () => {
    const key = `test-${Date.now()}-over`;
    checkRateLimit(key, testConfig);
    checkRateLimit(key, testConfig);
    checkRateLimit(key, testConfig);
    const result = checkRateLimit(key, testConfig);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("isolates different keys", () => {
    const key1 = `test-${Date.now()}-iso1`;
    const key2 = `test-${Date.now()}-iso2`;

    checkRateLimit(key1, testConfig);
    checkRateLimit(key1, testConfig);
    checkRateLimit(key1, testConfig);

    const result = checkRateLimit(key2, testConfig);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("returns resetAt timestamp", () => {
    const key = `test-${Date.now()}-reset`;
    const result = checkRateLimit(key, testConfig);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("buildRateLimitKey", () => {
  it("builds correct key format", () => {
    const key = buildRateLimitKey("acme", "192.168.1.1", "availability");
    expect(key).toBe("acme:192.168.1.1:availability");
  });

  it("separates different routes", () => {
    const key1 = buildRateLimitKey("acme", "192.168.1.1", "availability");
    const key2 = buildRateLimitKey("acme", "192.168.1.1", "booking");
    expect(key1).not.toBe(key2);
  });

  it("separates different tenants", () => {
    const key1 = buildRateLimitKey("acme", "192.168.1.1", "booking");
    const key2 = buildRateLimitKey("other", "192.168.1.1", "booking");
    expect(key1).not.toBe(key2);
  });
});

describe("rate limit presets", () => {
  it("availability allows 60 per 10 minutes", () => {
    expect(RATE_LIMIT_AVAILABILITY.maxRequests).toBe(60);
    expect(RATE_LIMIT_AVAILABILITY.windowMs).toBe(600_000);
  });

  it("booking allows 10 per 10 minutes", () => {
    expect(RATE_LIMIT_BOOKING.maxRequests).toBe(10);
    expect(RATE_LIMIT_BOOKING.windowMs).toBe(600_000);
  });
});
