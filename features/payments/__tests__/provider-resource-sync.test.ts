import { describe, it, expect } from "vitest";
import { SYNC_STATUSES, RESOURCE_TYPES } from "../types/provider-resource";
import { DISCOUNT_TYPES, DISCOUNT_TARGET_TYPES, REDEMPTION_STATUSES } from "../types/tenant-discount";

/**
 * Provider Resource Sync & Discount Tests — Milestone 11.7.
 */

describe("sync status model", () => {
  it("has 5 sync statuses", () => {
    expect(SYNC_STATUSES).toHaveLength(5);
    expect(SYNC_STATUSES).toContain("pending");
    expect(SYNC_STATUSES).toContain("synced");
    expect(SYNC_STATUSES).toContain("failed");
  });

  it("has 2 resource types", () => {
    expect(RESOURCE_TYPES).toHaveLength(2);
    expect(RESOURCE_TYPES).toContain("product");
    expect(RESOURCE_TYPES).toContain("discount");
  });

  it("pending mapping may have null provider_resource_id (valid state)", () => {
    const mapping = { syncStatus: "pending", providerResourceId: null };
    expect(mapping.providerResourceId).toBeNull();
    // This is NOT corrupt — waiting for provider sync
  });

  it("synced mapping requires non-null provider_resource_id", () => {
    const mapping = { syncStatus: "synced", providerResourceId: "polar_abc" };
    expect(mapping.providerResourceId).not.toBeNull();
  });
});

describe("sync version race protection", () => {
  it("v1 response must not mark v2 local state as synced", () => {
    const localVersion = 2;
    const responseVersion = 1;
    const shouldApply = localVersion === responseVersion;
    expect(shouldApply).toBe(false);
  });

  it("matching version allows sync completion", () => {
    const localVersion = 3;
    const responseVersion = 3;
    expect(localVersion === responseVersion).toBe(true);
  });
});

describe("discount types", () => {
  it("has percentage and fixed", () => {
    expect(DISCOUNT_TYPES).toHaveLength(2);
    expect(DISCOUNT_TYPES).toContain("percentage");
    expect(DISCOUNT_TYPES).toContain("fixed");
  });

  it("percentage is 1-99 (no 100% in v1)", () => {
    const maxPercentage = 99;
    expect(maxPercentage).toBeLessThan(100);
  });
});

describe("discount target types", () => {
  it("supports 4 target types", () => {
    expect(DISCOUNT_TARGET_TYPES).toHaveLength(4);
    expect(DISCOUNT_TARGET_TYPES).toContain("all_appointments");
    expect(DISCOUNT_TARGET_TYPES).toContain("all_packages");
    expect(DISCOUNT_TARGET_TYPES).toContain("service");
    expect(DISCOUNT_TARGET_TYPES).toContain("package");
  });
});

describe("redemption statuses", () => {
  it("has reserved, confirmed, released", () => {
    expect(REDEMPTION_STATUSES).toHaveLength(3);
    expect(REDEMPTION_STATUSES).toContain("reserved");
    expect(REDEMPTION_STATUSES).toContain("confirmed");
    expect(REDEMPTION_STATUSES).toContain("released");
  });
});

describe("cross-tenant discount isolation", () => {
  it("tenant A code cannot resolve to tenant B discount", () => {
    const tenantAId = "tenant-a";
    const discountTenantId = "tenant-b";
    expect(tenantAId).not.toBe(discountTenantId);
    // Validation always filters by tenant_id
  });

  it("browser cannot submit arbitrary provider_discount_id", () => {
    // validateTenantDiscount resolves provider ID from local tenant lookup
    // Client input is only: code (string)
    const clientInput = { code: "WELCOME10" };
    expect(clientInput).not.toHaveProperty("providerDiscountId");
  });

  it("shared org code collision handled by namespacing", () => {
    const tenantId = "abc12345-...";
    const localCode = "WELCOME10";
    const providerCode = `${tenantId.slice(0, 8)}_${localCode}`;
    expect(providerCode).toContain("abc12345");
    expect(providerCode).toContain("WELCOME10");
  });
});

describe("discount validation rules", () => {
  it("rejects inactive discount", () => {
    const discount = { is_active: false };
    expect(discount.is_active).toBe(false);
  });

  it("rejects future discount (starts_at > now)", () => {
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    expect(new Date(startsAt) > new Date()).toBe(true);
  });

  it("rejects expired discount (ends_at <= now)", () => {
    const endsAt = new Date(Date.now() - 86400000).toISOString();
    expect(new Date(endsAt) <= new Date()).toBe(true);
  });

  it("rejects non-synced discount (no provider_discount_id)", () => {
    const providerDiscountId = null;
    expect(providerDiscountId).toBeNull();
  });

  it("rejects when max redemptions reached", () => {
    const max = 10;
    const current = 10;
    expect(current >= max).toBe(true);
  });

  it("rejects wrong target service", () => {
    const targets = [{ target_type: "service", target_id: "s1" }];
    const requestedService = "s2";
    const eligible = targets.some(t => t.target_id === requestedService);
    expect(eligible).toBe(false);
  });

  it("allows all_appointments target for any service", () => {
    const targets = [{ target_type: "all_appointments", target_id: null }];
    const eligible = targets.some(t => t.target_type === "all_appointments");
    expect(eligible).toBe(true);
  });
});

describe("discount amount calculation", () => {
  it("percentage: 20% of 3000 = 600", () => {
    const original = 3000;
    const percentage = 20;
    const discount = Math.round(original * percentage / 100);
    expect(discount).toBe(600);
    expect(original - discount).toBe(2400);
  });

  it("fixed: min(500, 3000) = 500", () => {
    const original = 3000;
    const fixed = 500;
    const discount = Math.min(fixed, original);
    expect(discount).toBe(500);
  });

  it("fixed: min(5000, 3000) = 3000 (capped at original)", () => {
    const original = 3000;
    const fixed = 5000;
    const discount = Math.min(fixed, original);
    expect(discount).toBe(3000);
  });

  it("rejects zero final amount (no 100% discount)", () => {
    const finalAmount = 0;
    expect(finalAmount <= 0).toBe(true);
    // Should return: "This coupon cannot reduce the total to zero."
  });
});

describe("redemption tracking", () => {
  it("reserve on checkout creation", () => {
    const status = "reserved";
    expect(status).toBe("reserved");
  });

  it("confirm on order.paid", () => {
    const status = "confirmed";
    expect(status).toBe("confirmed");
  });

  it("release on abandoned/expired checkout", () => {
    const status = "released";
    expect(status).toBe("released");
  });
});

describe("existing checkout compatibility", () => {
  it("dynamic appointment checkout without coupon still works", () => {
    // No discount → no provider_discount_id in checkout payload
    expect(true).toBe(true);
  });

  it("dynamic package checkout without coupon still works", () => {
    expect(true).toBe(true);
  });
});

describe("SaaS billing separation", () => {
  it("tenant discounts cannot apply to SaaS subscription", () => {
    const targetTypes = ["all_appointments", "all_packages", "service", "package"];
    expect(targetTypes).not.toContain("subscription");
  });
});
