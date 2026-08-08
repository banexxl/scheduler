/**
 * Review Types Tests — Milestone 8.7.
 */

import { describe, it, expect } from "vitest";
import { REVIEW_STATUSES } from "../types/review";

describe("review constants", () => {
  it("has 3 review statuses", () => {
    expect(REVIEW_STATUSES).toHaveLength(3);
    expect(REVIEW_STATUSES).toContain("published");
    expect(REVIEW_STATUSES).toContain("hidden");
    expect(REVIEW_STATUSES).toContain("flagged");
  });
});
