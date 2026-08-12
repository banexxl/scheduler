import { describe, it, expect } from "vitest";
import {
  generateGiftCardCode,
  normalizeGiftCardCode,
  hashGiftCardCode,
  getCodePrefix,
  formatCodeForDisplay,
} from "../utils/gift-card-code";

describe("gift card code utilities", () => {
  describe("generateGiftCardCode", () => {
    it("generates a code in expected format", () => {
      const code = generateGiftCardCode();
      expect(code).toMatch(/^GS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it("generates unique codes", () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateGiftCardCode()));
      expect(codes.size).toBe(100);
    });

    it("does not contain confusing characters (0, O, 1, I)", () => {
      const codes = Array.from({ length: 50 }, () => generateGiftCardCode());
      for (const code of codes) {
        const body = code.replace(/^GS-/, "").replace(/-/g, "");
        expect(body).not.toMatch(/[0OI1]/);
      }
    });
  });

  describe("normalizeGiftCardCode", () => {
    it("uppercases and strips hyphens/spaces", () => {
      expect(normalizeGiftCardCode("gs-abcd-efgh-ijkl-mnop")).toBe("GSABCDEFGHIJKLMNOP");
    });

    it("trims whitespace", () => {
      expect(normalizeGiftCardCode("  GS-TEST  ")).toBe("GSTEST");
    });
  });

  describe("hashGiftCardCode", () => {
    it("returns a 64-char hex hash", () => {
      const hash = hashGiftCardCode("GS-ABCD-EFGH-IJKL-MNOP");
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("is deterministic", () => {
      const h1 = hashGiftCardCode("GS-TEST-CODE-1234-5678");
      const h2 = hashGiftCardCode("GS-TEST-CODE-1234-5678");
      expect(h1).toBe(h2);
    });

    it("normalizes before hashing (case insensitive)", () => {
      const h1 = hashGiftCardCode("GS-ABCD-EFGH");
      const h2 = hashGiftCardCode("gs-abcd-efgh");
      expect(h1).toBe(h2);
    });
  });

  describe("getCodePrefix", () => {
    it("extracts first two segments", () => {
      expect(getCodePrefix("GS-ABCD-EFGH-IJKL-MNOP")).toBe("GS-ABCD");
    });
  });

  describe("formatCodeForDisplay", () => {
    it("returns already formatted code as-is", () => {
      expect(formatCodeForDisplay("GS-ABCD-EFGH-IJKL-MNOP")).toBe("GS-ABCD-EFGH-IJKL-MNOP");
    });
  });
});
