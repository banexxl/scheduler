/**
 * Portal Token Service Tests — Milestone 8.6.
 */

import { describe, it, expect } from "vitest";
import { normalizeEmail } from "../services/portal-token-service";

describe("normalizeEmail", () => {
  it("lowercases email", () => {
    expect(normalizeEmail("John@Example.COM")).toBe("john@example.com");
  });

  it("trims whitespace", () => {
    expect(normalizeEmail("  user@test.com  ")).toBe("user@test.com");
  });

  it("handles already normalized email", () => {
    expect(normalizeEmail("user@test.com")).toBe("user@test.com");
  });
});
