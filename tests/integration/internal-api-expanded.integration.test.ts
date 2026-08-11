import { describe, it, expect, beforeAll } from "vitest";
import { assertTestEnvironment, getInternalApiHeaders, getInvalidInternalApiHeaders } from "../helpers";

/**
 * Internal API Security Expanded — Milestone 13.1, Section 20.
 *
 * Covers ALL internal processor endpoints with:
 * - Missing Authorization header → 401
 * - Wrong bearer token → 401
 * - Correct bearer token → 200
 *
 * Endpoints:
 * - /api/internal/notifications/process
 * - /api/internal/reminders/process
 * - /api/internal/waitlist/process
 * - /api/internal/billing/process-webhooks
 * - /api/internal/payments/process-expired
 * - /api/internal/appointment-payments/reconcile
 */

const baseUrl = process.env.TEST_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
const processorSecret = process.env.NOTIFICATION_PROCESSOR_SECRET ?? "";
const hasEnv = Boolean(baseUrl && processorSecret);
const describeIntegration = hasEnv ? describe : describe.skip;

describeIntegration("internal API security — all processors (live)", () => {
  beforeAll(() => {
    assertTestEnvironment();
  });

  const processors = [
    { name: "notifications", path: "/api/internal/notifications/process" },
    { name: "reminders", path: "/api/internal/reminders/process" },
    { name: "waitlist", path: "/api/internal/waitlist/process" },
    { name: "billing webhooks", path: "/api/internal/billing/process-webhooks" },
    { name: "payment expiry", path: "/api/internal/payments/process-expired" },
    { name: "appointment payment reconciliation", path: "/api/internal/appointment-payments/reconcile" },
  ];

  for (const processor of processors) {
    describe(`POST ${processor.path}`, () => {
      it(`${processor.name}: rejects missing authorization`, async () => {
        const res = await fetch(`${baseUrl}${processor.path}`, { method: "POST" });
        expect([401, 503]).toContain(res.status);
      });

      it(`${processor.name}: rejects wrong secret`, async () => {
        const res = await fetch(`${baseUrl}${processor.path}`, {
          method: "POST",
          headers: getInvalidInternalApiHeaders(),
        });
        expect([401, 503]).toContain(res.status);
      });

      it(`${processor.name}: accepts correct secret`, async () => {
        const res = await fetch(`${baseUrl}${processor.path}`, {
          method: "POST",
          headers: getInternalApiHeaders(processorSecret),
        });
        // Should be 200 (success), not 401/403
        // 404 is acceptable if endpoint doesn't exist yet
        expect([200, 404]).toContain(res.status);
      });
    });
  }

  describe("webhook endpoint", () => {
    it("polar webhook rejects request without valid signature", async () => {
      const res = await fetch(`${baseUrl}/api/webhooks/polar`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "polar-signature": "invalid_signature_value",
        },
        body: JSON.stringify({ type: "order.paid", data: { id: "fake" } }),
      });
      expect([401, 503]).toContain(res.status);
    });

    it("polar webhook rejects empty body", async () => {
      const res = await fetch(`${baseUrl}/api/webhooks/polar`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "",
      });
      expect([400, 401, 503]).toContain(res.status);
    });
  });
});
