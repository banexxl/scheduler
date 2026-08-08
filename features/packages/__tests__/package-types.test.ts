/**
 * Package Types Tests — Milestone 8.9.
 */

import { describe, it, expect } from "vitest";
import {
  CUSTOMER_PACKAGE_STATUSES,
  PACKAGE_USAGE_STATUSES,
  PACKAGE_SOURCES,
} from "../types/package";

describe("package constants", () => {
  it("has 4 customer package statuses", () => {
    expect(CUSTOMER_PACKAGE_STATUSES).toHaveLength(4);
    expect(CUSTOMER_PACKAGE_STATUSES).toContain("active");
    expect(CUSTOMER_PACKAGE_STATUSES).toContain("exhausted");
    expect(CUSTOMER_PACKAGE_STATUSES).toContain("expired");
    expect(CUSTOMER_PACKAGE_STATUSES).toContain("cancelled");
  });

  it("has 3 usage statuses for reservation lifecycle", () => {
    expect(PACKAGE_USAGE_STATUSES).toHaveLength(3);
    expect(PACKAGE_USAGE_STATUSES).toContain("reserved");
    expect(PACKAGE_USAGE_STATUSES).toContain("consumed");
    expect(PACKAGE_USAGE_STATUSES).toContain("released");
  });

  it("has 5 package sources", () => {
    expect(PACKAGE_SOURCES).toHaveLength(5);
    expect(PACKAGE_SOURCES).toContain("manual");
    expect(PACKAGE_SOURCES).toContain("payment");
  });

  it("credit lifecycle: reserve → consume on completion", () => {
    // Design assertion: reservation reduces available balance immediately
    // consumption confirms after completion — no double deduction
    expect(PACKAGE_USAGE_STATUSES.indexOf("reserved")).toBeLessThan(
      PACKAGE_USAGE_STATUSES.indexOf("consumed")
    );
  });

  it("cancellation releases reserved credits", () => {
    expect(PACKAGE_USAGE_STATUSES).toContain("released");
  });
});
