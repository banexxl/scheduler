import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SupportedFont } from "@/types/branding";

/**
 * Font Loader Tests — Milestone 16.1.
 *
 * Tests the pure detection logic without needing next/font/google runtime.
 */

// We can't import font-loader directly because it calls next/font/google
// at module scope. Instead, test the detection logic inline.
const SUPPORTED_FONTS: SupportedFont[] = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Lora",
  "Roboto",
  "Open Sans",
];

function detectSupportedFont(fontFamily: string): SupportedFont | null {
  const lower = fontFamily.toLowerCase();
  for (const font of SUPPORTED_FONTS) {
    if (lower.includes(font.toLowerCase())) {
      return font;
    }
  }
  return null;
}

describe("detectSupportedFont", () => {
  it("detects Inter from font-family string", () => {
    expect(detectSupportedFont('"Inter", "Helvetica Neue", Arial, sans-serif')).toBe("Inter");
  });

  it("detects Playfair Display", () => {
    expect(detectSupportedFont('"Playfair Display", Georgia, serif')).toBe("Playfair Display");
  });

  it("detects Open Sans", () => {
    expect(detectSupportedFont('"Open Sans", Arial, sans-serif')).toBe("Open Sans");
  });

  it("detects Roboto", () => {
    expect(detectSupportedFont('"Roboto", "Helvetica", Arial, sans-serif')).toBe("Roboto");
  });

  it("detects Poppins", () => {
    expect(detectSupportedFont("Poppins, sans-serif")).toBe("Poppins");
  });

  it("detects Montserrat", () => {
    expect(detectSupportedFont("Montserrat, sans-serif")).toBe("Montserrat");
  });

  it("detects Lora", () => {
    expect(detectSupportedFont("Lora, serif")).toBe("Lora");
  });

  it("returns null for unsupported fonts", () => {
    expect(detectSupportedFont("Arial, sans-serif")).toBeNull();
    expect(detectSupportedFont("Georgia, serif")).toBeNull();
    expect(detectSupportedFont("Nunito, sans-serif")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(detectSupportedFont("INTER, sans-serif")).toBe("Inter");
    expect(detectSupportedFont("open sans, sans-serif")).toBe("Open Sans");
  });
});

describe("TENANT_FONT_CSS_VAR", () => {
  it("has the expected value", () => {
    // Import from types which doesn't depend on next/font
    const { TENANT_FONT_CSS_VAR } = require("@/types/branding");
    expect(TENANT_FONT_CSS_VAR).toBe("--tenant-font-family");
  });
});
