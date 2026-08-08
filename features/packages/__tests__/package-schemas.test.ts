/**
 * Package Schema Validation Tests — Milestone 8.9.
 */

import { describe, it, expect } from "vitest";
import { packageFormSchema, adjustCreditsSchema } from "../schemas/package-schemas";

describe("packageFormSchema", () => {
  it("accepts valid input", async () => {
    const result = await packageFormSchema.validate({
      name: "10 Massages",
      totalCredits: 10,
      validityDays: 90,
    });
    expect(result.name).toBe("10 Massages");
    expect(result.totalCredits).toBe(10);
  });

  it("rejects short name", async () => {
    await expect(packageFormSchema.validate({ name: "A", totalCredits: 5 })).rejects.toThrow();
  });

  it("rejects zero credits", async () => {
    await expect(packageFormSchema.validate({ name: "Pack", totalCredits: 0 })).rejects.toThrow();
  });

  it("rejects credits over 1000", async () => {
    await expect(packageFormSchema.validate({ name: "Pack", totalCredits: 1001 })).rejects.toThrow();
  });

  it("accepts null validity (no expiry)", async () => {
    const result = await packageFormSchema.validate({ name: "Pack", totalCredits: 5, validityDays: null });
    expect(result.validityDays).toBeNull();
  });

  it("rejects validity over 3650", async () => {
    await expect(packageFormSchema.validate({ name: "Pack", totalCredits: 5, validityDays: 3651 })).rejects.toThrow();
  });
});

describe("adjustCreditsSchema", () => {
  it("accepts positive delta", async () => {
    const result = await adjustCreditsSchema.validate({
      customerPackageId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      delta: 3,
      reason: "Courtesy credit",
    });
    expect(result.delta).toBe(3);
  });

  it("accepts negative delta", async () => {
    const result = await adjustCreditsSchema.validate({
      customerPackageId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      delta: -1,
      reason: "Correction",
    });
    expect(result.delta).toBe(-1);
  });

  it("rejects zero delta", async () => {
    await expect(adjustCreditsSchema.validate({
      customerPackageId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      delta: 0,
      reason: "No change",
    })).rejects.toThrow();
  });

  it("rejects empty reason", async () => {
    await expect(adjustCreditsSchema.validate({
      customerPackageId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      delta: 1,
      reason: "",
    })).rejects.toThrow();
  });
});
