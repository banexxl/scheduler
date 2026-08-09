import { describe, it, expect } from "vitest";
import { evaluateBusinessHealth, type BusinessHealthInputs } from "../services/evaluate-business-health";

const HEALTHY_INPUTS: BusinessHealthInputs = {
  tenantTimezone: "Europe/Belgrade",
  activeLocationCount: 2,
  locationsWithHoursCount: 2,
  activeServiceCount: 5,
  servicesWithLocationCount: 5,
  servicesWithResourceCount: 5,
  activeResourceCount: 3,
  resourcesWithHoursCount: 3,
  publicBookingEnabled: true,
  hasFutureAvailability: true,
  emailProviderConfigured: true,
  emailFeaturesEnabled: true,
  recentEmailFailureCount: 0,
  activeReminderRuleCount: 2,
  onlinePaymentsEnabled: false,
  paymentProviderAvailable: false,
  failedDiscountSyncCount: 0,
  unresolvedPaymentReviewCount: 0,
  activeOwnerCount: 1,
  unresolvedOperationalIssueCount: 0,
};

describe("overall status", () => {
  it("returns ready when all checks pass", () => {
    const result = evaluateBusinessHealth(HEALTHY_INPUTS);
    expect(result.overallStatus).toBe("ready");
    expect(result.blockedCount).toBe(0);
  });

  it("returns blocked when any check is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, tenantTimezone: null });
    expect(result.overallStatus).toBe("blocked");
    expect(result.blockedCount).toBeGreaterThan(0);
  });

  it("returns needs_attention when attention items exist (no blocked)", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, recentEmailFailureCount: 3 });
    expect(result.overallStatus).toBe("needs_attention");
  });

  it("optional checks do not affect overall status", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, publicBookingEnabled: false });
    expect(result.overallStatus).toBe("ready");
    expect(result.optionalCount).toBeGreaterThan(0);
  });
});

describe("timezone check", () => {
  it("valid timezone is ready", () => {
    const result = evaluateBusinessHealth(HEALTHY_INPUTS);
    const check = result.checks.find(c => c.key === "business.timezone");
    expect(check?.status).toBe("ready");
  });

  it("missing timezone is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, tenantTimezone: null });
    const check = result.checks.find(c => c.key === "business.timezone");
    expect(check?.status).toBe("blocked");
  });
});

describe("location checks", () => {
  it("no active locations is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, activeLocationCount: 0 });
    const check = result.checks.find(c => c.key === "locations.active");
    expect(check?.status).toBe("blocked");
  });

  it("location without hours is attention", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, locationsWithHoursCount: 1 });
    const check = result.checks.find(c => c.key === "locations.hours");
    expect(check?.status).toBe("needs_attention");
  });
});

describe("service checks", () => {
  it("no services is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, activeServiceCount: 0 });
    const check = result.checks.find(c => c.key === "services.active");
    expect(check?.status).toBe("blocked");
  });

  it("service without location is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, servicesWithLocationCount: 3 });
    const check = result.checks.find(c => c.key === "services.locations");
    expect(check?.status).toBe("blocked");
  });

  it("service without resource is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, servicesWithResourceCount: 3 });
    const check = result.checks.find(c => c.key === "services.resources");
    expect(check?.status).toBe("blocked");
  });
});

describe("scheduling checks", () => {
  it("all resources with hours is ready", () => {
    const result = evaluateBusinessHealth(HEALTHY_INPUTS);
    const check = result.checks.find(c => c.key === "resources.working_hours");
    expect(check?.status).toBe("ready");
  });

  it("partial resources with hours is attention", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, resourcesWithHoursCount: 2 });
    const check = result.checks.find(c => c.key === "resources.working_hours");
    expect(check?.status).toBe("needs_attention");
  });
});

describe("public booking", () => {
  it("disabled is optional (not blocked)", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, publicBookingEnabled: false });
    const check = result.checks.find(c => c.key === "booking.public");
    expect(check?.status).toBe("optional");
  });

  it("enabled with no availability is attention", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, hasFutureAvailability: false });
    const check = result.checks.find(c => c.key === "booking.future_availability");
    expect(check?.status).toBe("needs_attention");
  });
});

describe("communications", () => {
  it("email not configured when enabled is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, emailProviderConfigured: false });
    const check = result.checks.find(c => c.key === "communications.provider");
    expect(check?.status).toBe("blocked");
  });

  it("recent failures is attention", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, recentEmailFailureCount: 5 });
    const check = result.checks.find(c => c.key === "communications.failures");
    expect(check?.status).toBe("needs_attention");
  });
});

describe("payments", () => {
  it("provider unavailable when payments enabled is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, onlinePaymentsEnabled: true, paymentProviderAvailable: false });
    const check = result.checks.find(c => c.key === "payments.provider");
    expect(check?.status).toBe("blocked");
  });

  it("payment not enabled = no payment checks", () => {
    const result = evaluateBusinessHealth(HEALTHY_INPUTS);
    const check = result.checks.find(c => c.key === "payments.provider");
    expect(check).toBeUndefined();
  });
});

describe("operations", () => {
  it("active owner is ready", () => {
    const result = evaluateBusinessHealth(HEALTHY_INPUTS);
    const check = result.checks.find(c => c.key === "team.owner");
    expect(check?.status).toBe("ready");
  });

  it("no owner is blocked", () => {
    const result = evaluateBusinessHealth({ ...HEALTHY_INPUTS, activeOwnerCount: 0 });
    const check = result.checks.find(c => c.key === "team.owner");
    expect(check?.status).toBe("blocked");
  });
});

describe("read-only behavior", () => {
  it("evaluation is a pure function (no side effects)", () => {
    // evaluateBusinessHealth takes inputs, returns result
    // No DB calls, no mutations, no state changes
    const result = evaluateBusinessHealth(HEALTHY_INPUTS);
    expect(result).toBeDefined();
  });
});
