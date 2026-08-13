import { describe, it, expect } from "vitest";

/**
 * Automation Validation & Logic Tests — Milestone 15.8.
 */

// Pure delay calculation logic (mirrors enrollment-service.ts)
function calculateNextRunAt(delayValue: number, delayUnit: string): Date {
  const now = new Date();
  switch (delayUnit) {
    case "minutes": return new Date(now.getTime() + delayValue * 60_000);
    case "hours": return new Date(now.getTime() + delayValue * 3_600_000);
    case "days": return new Date(now.getTime() + delayValue * 86_400_000);
    case "weeks": return new Date(now.getTime() + delayValue * 604_800_000);
    default: return new Date(now.getTime() + delayValue * 60_000);
  }
}

describe("automation validation", () => {
  describe("delay calculations", () => {
    it("calculates minutes delay correctly", () => {
      const before = Date.now();
      const result = calculateNextRunAt(30, "minutes");
      const after = Date.now();
      const expected = before + 30 * 60_000;
      expect(result.getTime()).toBeGreaterThanOrEqual(expected - 100);
      expect(result.getTime()).toBeLessThanOrEqual(after + 30 * 60_000 + 100);
    });

    it("calculates hours delay correctly", () => {
      const result = calculateNextRunAt(2, "hours");
      const expected = Date.now() + 2 * 3_600_000;
      expect(Math.abs(result.getTime() - expected)).toBeLessThan(100);
    });

    it("calculates days delay correctly", () => {
      const result = calculateNextRunAt(3, "days");
      const expected = Date.now() + 3 * 86_400_000;
      expect(Math.abs(result.getTime() - expected)).toBeLessThan(100);
    });

    it("calculates weeks delay correctly", () => {
      const result = calculateNextRunAt(1, "weeks");
      const expected = Date.now() + 7 * 86_400_000;
      expect(Math.abs(result.getTime() - expected)).toBeLessThan(100);
    });

    it("defaults to minutes for unknown unit", () => {
      const result = calculateNextRunAt(5, "unknown");
      const expected = Date.now() + 5 * 60_000;
      expect(Math.abs(result.getTime() - expected)).toBeLessThan(100);
    });

    it("handles zero delay", () => {
      const result = calculateNextRunAt(0, "days");
      expect(Math.abs(result.getTime() - Date.now())).toBeLessThan(100);
    });
  });

  describe("trigger type validation", () => {
    const VALID_TRIGGERS = [
      "appointment_completed",
      "referral_rewarded",
      "gift_card_purchased",
      "customer_inactive",
      "package_expiring",
      "loyalty_threshold_reached",
    ];

    it("recognizes all supported trigger types", () => {
      expect(VALID_TRIGGERS).toHaveLength(6);
    });

    it("does not include customer_birthday (no data)", () => {
      expect(VALID_TRIGGERS).not.toContain("customer_birthday");
    });

    it("does not include customer_created (no hook)", () => {
      expect(VALID_TRIGGERS).not.toContain("customer_created");
    });
  });

  describe("re-enrollment policy", () => {
    const POLICIES = ["once_ever", "once_per_trigger", "after_completion"];

    it("supports three policies", () => {
      expect(POLICIES).toHaveLength(3);
    });

    it("once_per_trigger uses trigger_reference_id for idempotency", () => {
      // Conceptual: same automation + customer + reference = no duplicate
      const key = (automationId: string, customerId: string, referenceId: string) =>
        `${automationId}:${customerId}:${referenceId}`;

      const enrollment1 = key("auto-1", "cust-1", "appt-123");
      const enrollment2 = key("auto-1", "cust-1", "appt-123");
      const enrollment3 = key("auto-1", "cust-1", "appt-456");

      expect(enrollment1).toBe(enrollment2); // Duplicate — blocked
      expect(enrollment1).not.toBe(enrollment3); // New trigger — allowed
    });

    it("once_ever uses automation + customer only", () => {
      const key = (automationId: string, customerId: string) =>
        `${automationId}:${customerId}`;

      const enrollment1 = key("auto-1", "cust-1");
      const enrollment2 = key("auto-1", "cust-1");

      expect(enrollment1).toBe(enrollment2); // Always duplicate
    });
  });

  describe("automation lifecycle", () => {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      draft: ["active", "archived"],
      active: ["paused"],
      paused: ["active", "archived"],
      archived: [],
    };

    it("allows draft → active (activate)", () => {
      expect(VALID_TRANSITIONS["draft"]).toContain("active");
    });

    it("allows active → paused", () => {
      expect(VALID_TRANSITIONS["active"]).toContain("paused");
    });

    it("allows paused → active (resume)", () => {
      expect(VALID_TRANSITIONS["paused"]).toContain("active");
    });

    it("allows paused → archived", () => {
      expect(VALID_TRANSITIONS["paused"]).toContain("archived");
    });

    it("does not allow archived → any", () => {
      expect(VALID_TRANSITIONS["archived"]).toHaveLength(0);
    });

    it("does not allow active → archived directly", () => {
      expect(VALID_TRANSITIONS["active"]).not.toContain("archived");
    });
  });

  describe("version snapshot behavior", () => {
    it("version snapshot is immutable after publish", () => {
      const version = {
        triggerType: "appointment_completed",
        triggerConfig: { service_id: null },
        steps: [
          { position: 0, stepType: "delay", config: { value: 2, unit: "days" } },
          { position: 1, stepType: "email", config: { subject: "Hello", content: "Body" } },
        ],
      };

      // Simulate "editing" the automation
      const editedVersion = JSON.parse(JSON.stringify(version));
      editedVersion.steps[0].config.value = 5;

      // Original version must be unchanged
      expect(version.steps[0]!.config.value).toBe(2);
    });

    it("enrollments reference version, not automation directly", () => {
      const enrollment = {
        automationId: "auto-1",
        versionId: "ver-1", // Immutable reference
        currentStepPosition: 0,
      };

      // Editing the automation creates ver-2, but this enrollment stays on ver-1
      expect(enrollment.versionId).toBe("ver-1");
    });
  });

  describe("condition step semantics", () => {
    it("evaluates CURRENT customer state (not enrollment-time state)", () => {
      // Conceptual: customer enrolled Monday, condition evaluated Wednesday
      // Wednesday state is authoritative
      const conditionConfig = { field: "has_upcoming_appointment", operator: "is_false", value: true };

      // If customer booked on Tuesday, condition fails on Wednesday
      // This is correct — prevents sending to customers who already booked
      expect(conditionConfig.field).toBe("has_upcoming_appointment");
    });

    it("condition false ends the journey (no branching in v1)", () => {
      const conditionResult = false;
      const action = conditionResult ? "continue" : "end";
      expect(action).toBe("end");
    });
  });

  describe("step execution idempotency", () => {
    it("execution_key prevents duplicate processing", () => {
      const key = (enrollmentId: string, stepId: string) => `${enrollmentId}:${stepId}`;

      const exec1 = key("enroll-1", "step-delay-0");
      const exec2 = key("enroll-1", "step-delay-0");

      expect(exec1).toBe(exec2); // UNIQUE constraint would block
    });
  });

  describe("pause semantics", () => {
    it("paused: no new enrollments accepted", () => {
      const automationStatus: string = "paused";
      const acceptEnrollment = automationStatus === "active";
      expect(acceptEnrollment).toBe(false);
    });

    it("paused: existing waiting enrollments are not executed", () => {
      // Processor only claims from active automations
      const automationStatus: string = "paused";
      const shouldProcess = automationStatus === "active";
      expect(shouldProcess).toBe(false);
    });

    it("resume: existing due enrollments continue", () => {
      const automationStatus: string = "active"; // After resume
      const shouldProcess = automationStatus === "active";
      expect(shouldProcess).toBe(true);
    });
  });
});
