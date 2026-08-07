/**
 * Analytics Types and Constants Tests — Milestone 8.4.
 */

import { describe, it, expect } from "vitest";
import { ANALYTICS_PERIODS } from "../types/analytics";

describe("analytics constants", () => {
  it("has 4 period options", () => {
    expect(ANALYTICS_PERIODS).toHaveLength(4);
    expect(ANALYTICS_PERIODS).toContain("today");
    expect(ANALYTICS_PERIODS).toContain("7days");
    expect(ANALYTICS_PERIODS).toContain("this_month");
    expect(ANALYTICS_PERIODS).toContain("prev_month");
  });
});
