import { describe, it, expect, beforeAll } from "vitest";

/**
 * Internal API Security Integration Tests — Milestone 10.5.
 *
 * Verifies all internal processing endpoints reject unauthorized access
 * and accept valid secrets. Uses real HTTP against the running app.
 *
 * Environment requirements:
 *   - NEXT_PUBLIC_APP_URL or TEST_BASE_URL
 *   - NOTIFICATION_PROCESSOR_SECRET (for positive test)
 *   - E2E_TEST_MODE=true
 */

const baseUrl = process.env.TEST_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const processorSecret = process.env.NOTIFICATION_PROCESSOR_SECRET ?? "";
const hasEnv = Boolean(baseUrl && processorSecret);
const describeIntegration = hasEnv ? describe : describe.skip;

describeIntegration("internal API security (live)", () => {
  beforeAll(() => {
    if (process.env.INTEGRATION_REQUIRED === "1" && !hasEnv) {
      throw new Error("Integration environment not configured. Set TEST_BASE_URL and NOTIFICATION_PROCESSOR_SECRET.");
    }
  });

  describe("POST /api/internal/notifications/process", () => {
    const url = `${baseUrl}/api/internal/notifications/process`;

    it("rejects missing authorization", async () => {
      const res = await fetch(url, { method: "POST" });
      expect(res.status).toBe(401);
    });

    it("rejects wrong secret", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret-value" },
      });
      expect(res.status).toBe(401);
    });

    it("accepts correct secret", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${processorSecret}` },
      });
      // Should be 200 (no work) or 200 with results — not 401/403
      expect([200]).toContain(res.status);
      const body = await res.json();
      expect(body).toHaveProperty("processed");
    });
  });

  describe("POST /api/internal/reminders/process", () => {
    const url = `${baseUrl}/api/internal/reminders/process`;

    it("rejects missing authorization", async () => {
      const res = await fetch(url, { method: "POST" });
      expect(res.status).toBe(401);
    });

    it("rejects wrong secret", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer wrong-value" },
      });
      expect(res.status).toBe(401);
    });

    it("accepts correct secret", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${processorSecret}` },
      });
      expect([200]).toContain(res.status);
      const body = await res.json();
      expect(body).toHaveProperty("processed");
    });
  });

  describe("POST /api/internal/waitlist/process", () => {
    const url = `${baseUrl}/api/internal/waitlist/process`;

    it("rejects missing authorization", async () => {
      const res = await fetch(url, { method: "POST" });
      expect(res.status).toBe(401);
    });

    it("rejects wrong secret", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer bad-secret" },
      });
      expect(res.status).toBe(401);
    });

    it("accepts correct secret", async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${processorSecret}` },
      });
      expect([200]).toContain(res.status);
    });
  });
});
