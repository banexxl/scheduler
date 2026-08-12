import { describe, it, expect } from "vitest";
import { generateReferralCode, normalizeReferralCode } from "../utils/referral-code-generator";

describe("referral code generator", () => {
  it("generates a code with prefix", () => {
    const code = generateReferralCode("Ana");
    expect(code).toMatch(/^ANA-[A-Z0-9]{4}$/);
  });

  it("generates a code without prefix", () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateReferralCode("Test")));
    expect(codes.size).toBe(50);
  });

  it("does not contain confusing characters", () => {
    const codes = Array.from({ length: 50 }, () => generateReferralCode());
    for (const code of codes) {
      expect(code).not.toMatch(/[0OI1]/);
    }
  });
});

describe("normalizeReferralCode", () => {
  it("uppercases and trims", () => {
    expect(normalizeReferralCode("  ana-k7q4  ")).toBe("ANA-K7Q4");
  });

  it("removes spaces", () => {
    expect(normalizeReferralCode("ANA K7Q4")).toBe("ANAK7Q4");
  });
});
