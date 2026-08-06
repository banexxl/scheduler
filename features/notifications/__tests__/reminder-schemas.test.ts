/**
 * Reminder Rule Schema Validation Tests — Milestone 6.13.
 */

import { describe, it, expect } from "vitest";
import { reminderRuleSchema, validateOffsetMinutes } from "../schemas/reminder-rule-schemas";

describe("reminderRuleSchema", () => {
  const validInput = {
    name: "24 hours before",
    offsetAmount: 24,
    offsetUnit: "hours",
    isActive: true,
  };

  it("accepts valid input", async () => {
    const result = await reminderRuleSchema.validate(validInput);
    expect(result.name).toBe("24 hours before");
    expect(result.offsetAmount).toBe(24);
    expect(result.offsetUnit).toBe("hours");
  });

  it("rejects empty name", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, name: "" })
    ).rejects.toThrow();
  });

  it("rejects name over 120 chars", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, name: "A".repeat(121) })
    ).rejects.toThrow();
  });

  it("rejects zero amount", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, offsetAmount: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative amount", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, offsetAmount: -1 })
    ).rejects.toThrow();
  });

  it("rejects amount over 365", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, offsetAmount: 366 })
    ).rejects.toThrow();
  });

  it("rejects decimal amounts", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, offsetAmount: 1.5 })
    ).rejects.toThrow();
  });

  it("rejects invalid unit", async () => {
    await expect(
      reminderRuleSchema.validate({ ...validInput, offsetUnit: "weeks" })
    ).rejects.toThrow();
  });

  it("accepts minutes unit", async () => {
    const result = await reminderRuleSchema.validate({
      ...validInput,
      offsetAmount: 30,
      offsetUnit: "minutes",
    });
    expect(result.offsetUnit).toBe("minutes");
  });

  it("accepts days unit", async () => {
    const result = await reminderRuleSchema.validate({
      ...validInput,
      offsetAmount: 7,
      offsetUnit: "days",
    });
    expect(result.offsetUnit).toBe("days");
  });

  it("defaults isActive to true", async () => {
    const { isActive, ...rest } = validInput;
    void isActive;
    const result = await reminderRuleSchema.validate(rest);
    expect(result.isActive).toBe(true);
  });
});

describe("validateOffsetMinutes", () => {
  it("returns null for valid offsets", () => {
    expect(validateOffsetMinutes(30, "minutes")).toBeNull();
    expect(validateOffsetMinutes(2, "hours")).toBeNull();
    expect(validateOffsetMinutes(7, "days")).toBeNull();
    expect(validateOffsetMinutes(365, "days")).toBeNull();
  });

  it("rejects offset below 5 minutes", () => {
    expect(validateOffsetMinutes(4, "minutes")).not.toBeNull();
    expect(validateOffsetMinutes(3, "minutes")).not.toBeNull();
    expect(validateOffsetMinutes(1, "minutes")).not.toBeNull();
  });

  it("accepts exactly 5 minutes", () => {
    expect(validateOffsetMinutes(5, "minutes")).toBeNull();
  });

  it("rejects offset above 525600 minutes (365 days)", () => {
    expect(validateOffsetMinutes(366, "days")).not.toBeNull();
  });

  it("accepts exactly 365 days", () => {
    expect(validateOffsetMinutes(365, "days")).toBeNull();
  });

  it("rejects invalid unit", () => {
    expect(validateOffsetMinutes(10, "weeks")).not.toBeNull();
  });

  it("correctly converts hours to minutes for validation", () => {
    // 1 hour = 60 minutes, which is >= 5
    expect(validateOffsetMinutes(1, "hours")).toBeNull();
  });

  it("correctly converts days to minutes for validation", () => {
    // 1 day = 1440 minutes
    expect(validateOffsetMinutes(1, "days")).toBeNull();
  });
});
