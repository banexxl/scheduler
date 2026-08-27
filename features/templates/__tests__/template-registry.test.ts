import { describe, it, expect } from "vitest";
import { TEMPLATE_IDS, DEFAULT_TEMPLATE_ID, type TemplateId } from "../types";

/**
 * Template Registry Tests — Milestone 16.2.
 *
 * Tests the template types and validation logic.
 * Does NOT import registry.ts (which imports shell components that depend on next/font).
 * Tests the pure data and validation aspects.
 */

function isValidTemplateId(value: string): value is TemplateId {
  return TEMPLATE_IDS.includes(value as TemplateId);
}

describe("TEMPLATE_IDS", () => {
  it("contains minimal, bold, and elegant", () => {
    expect(TEMPLATE_IDS).toContain("minimal");
    expect(TEMPLATE_IDS).toContain("bold");
    expect(TEMPLATE_IDS).toContain("elegant");
  });

  it("has exactly 3 templates", () => {
    expect(TEMPLATE_IDS).toHaveLength(3);
  });
});

describe("DEFAULT_TEMPLATE_ID", () => {
  it("is minimal", () => {
    expect(DEFAULT_TEMPLATE_ID).toBe("minimal");
  });

  it("is a valid template ID", () => {
    expect(isValidTemplateId(DEFAULT_TEMPLATE_ID)).toBe(true);
  });
});

describe("isValidTemplateId", () => {
  it("returns true for valid IDs", () => {
    expect(isValidTemplateId("minimal")).toBe(true);
    expect(isValidTemplateId("bold")).toBe(true);
    expect(isValidTemplateId("elegant")).toBe(true);
  });

  it("returns false for invalid IDs", () => {
    expect(isValidTemplateId("")).toBe(false);
    expect(isValidTemplateId("fancy")).toBe(false);
    expect(isValidTemplateId("MINIMAL")).toBe(false);
    expect(isValidTemplateId("minimal ")).toBe(false);
  });
});
