import { describe, it, expect, beforeAll } from "vitest";

/**
 * Health Endpoint Integration Tests — Milestone 10.5.
 *
 * Verifies health and readiness probes against live application.
 */

const baseUrl = process.env.TEST_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const hasEnv = Boolean(baseUrl);
const describeIntegration = hasEnv ? describe : describe.skip;

describeIntegration("health endpoints (live)", () => {
  beforeAll(() => {
    if (process.env.INTEGRATION_REQUIRED === "1" && !hasEnv) {
      throw new Error("Integration environment not configured. Set TEST_BASE_URL.");
    }
  });

  describe("GET /api/health", () => {
    it("returns 200 with status ok", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body).toHaveProperty("timestamp");
    });

    it("does not expose secrets", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const text = await res.text();
      expect(text).not.toContain("SUPABASE_SERVICE_ROLE");
      expect(text).not.toContain("password");
      expect(text).not.toContain("secret");
    });
  });

  describe("GET /api/health/supabase", () => {
    it("returns 200 when DB is reachable", async () => {
      const res = await fetch(`${baseUrl}/api/health/supabase`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.supabase).toBe("connected");
    });

    it("does not expose connection details", async () => {
      const res = await fetch(`${baseUrl}/api/health/supabase`);
      const text = await res.text();
      expect(text).not.toContain("postgresql://");
      expect(text).not.toContain("service_role");
    });
  });
});
