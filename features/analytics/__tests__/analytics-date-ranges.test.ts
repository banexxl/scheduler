/**
 * Analytics Date Range Tests — Milestone 8.4.
 *
 * Tests for period resolution, comparison ranges, and date series generation.
 * Uses fixed dates and explicit timezones (never browser-local).
 */

import { describe, it, expect } from "vitest";
import {
  resolveAnalyticsDateRange,
  resolveComparisonRange,
  getDateSeriesInRange,
} from "../services/analytics-date-ranges";

describe("resolveAnalyticsDateRange", () => {
  const tz = "America/New_York";

  it("resolves 'today' to single day in tenant timezone", () => {
    const now = new Date("2025-08-15T14:00:00.000Z"); // 10am ET
    const range = resolveAnalyticsDateRange("today", now, tz);

    expect(range.label).toBe("Today");
    // Start should be midnight Aug 15 ET = 04:00 UTC
    expect(range.start).toBe("2025-08-15T04:00:00.000Z");
    // End should be midnight Aug 16 ET = 04:00 UTC
    expect(range.end).toBe("2025-08-16T04:00:00.000Z");
  });

  it("resolves '7days' to 7 days ending tomorrow start", () => {
    const now = new Date("2025-08-15T14:00:00.000Z");
    const range = resolveAnalyticsDateRange("7days", now, tz);

    expect(range.label).toBe("Last 7 days");
    // 6 days before Aug 15 = Aug 9 midnight ET
    expect(range.start).toBe("2025-08-09T04:00:00.000Z");
    expect(range.end).toBe("2025-08-16T04:00:00.000Z");
  });

  it("resolves 'this_month' from month start to tomorrow", () => {
    const now = new Date("2025-08-15T14:00:00.000Z");
    const range = resolveAnalyticsDateRange("this_month", now, tz);

    expect(range.label).toBe("This month");
    // Aug 1 midnight ET
    expect(range.start).toBe("2025-08-01T04:00:00.000Z");
    expect(range.end).toBe("2025-08-16T04:00:00.000Z");
  });

  it("resolves 'prev_month' to full previous month", () => {
    const now = new Date("2025-08-15T14:00:00.000Z");
    const range = resolveAnalyticsDateRange("prev_month", now, tz);

    expect(range.label).toBe("Previous month");
    // Jul 1 midnight ET
    expect(range.start).toBe("2025-07-01T04:00:00.000Z");
    // Aug 1 midnight ET
    expect(range.end).toBe("2025-08-01T04:00:00.000Z");
  });

  it("uses UTC timezone correctly", () => {
    const now = new Date("2025-08-15T14:00:00.000Z");
    const range = resolveAnalyticsDateRange("today", now, "UTC");

    expect(range.start).toBe("2025-08-15T00:00:00.000Z");
    expect(range.end).toBe("2025-08-16T00:00:00.000Z");
  });
});

describe("resolveComparisonRange", () => {
  const tz = "UTC";

  it("returns yesterday for 'today'", () => {
    const now = new Date("2025-08-15T12:00:00.000Z");
    const range = resolveComparisonRange("today", now, tz);

    expect(range).not.toBeNull();
    expect(range!.label).toBe("Yesterday");
    expect(range!.start).toBe("2025-08-14T00:00:00.000Z");
    expect(range!.end).toBe("2025-08-15T00:00:00.000Z");
  });

  it("returns previous 7 days for '7days'", () => {
    const now = new Date("2025-08-15T12:00:00.000Z");
    const range = resolveComparisonRange("7days", now, tz);

    expect(range).not.toBeNull();
    expect(range!.label).toBe("Previous 7 days");
    // 13 days ago = Aug 2, ends 6 days ago = Aug 9
    expect(range!.start).toBe("2025-08-02T00:00:00.000Z");
    expect(range!.end).toBe("2025-08-09T00:00:00.000Z");
  });

  it("returns previous month for 'this_month'", () => {
    const now = new Date("2025-08-15T12:00:00.000Z");
    const range = resolveComparisonRange("this_month", now, tz);

    expect(range).not.toBeNull();
    expect(range!.label).toBe("Previous month");
    expect(range!.start).toBe("2025-07-01T00:00:00.000Z");
    expect(range!.end).toBe("2025-08-01T00:00:00.000Z");
  });

  it("returns 2 months ago for 'prev_month'", () => {
    const now = new Date("2025-08-15T12:00:00.000Z");
    const range = resolveComparisonRange("prev_month", now, tz);

    expect(range).not.toBeNull();
    expect(range!.label).toBe("2 months ago");
    expect(range!.start).toBe("2025-06-01T00:00:00.000Z");
    expect(range!.end).toBe("2025-07-01T00:00:00.000Z");
  });
});

describe("getDateSeriesInRange", () => {
  it("generates correct date series for UTC range", () => {
    const dates = getDateSeriesInRange(
      "2025-08-10T00:00:00.000Z",
      "2025-08-13T00:00:00.000Z",
      "UTC"
    );

    expect(dates).toEqual(["2025-08-10", "2025-08-11", "2025-08-12"]);
  });

  it("generates single date for 1-day range", () => {
    const dates = getDateSeriesInRange(
      "2025-08-10T00:00:00.000Z",
      "2025-08-11T00:00:00.000Z",
      "UTC"
    );

    expect(dates).toEqual(["2025-08-10"]);
  });

  it("returns empty array when start equals end", () => {
    const dates = getDateSeriesInRange(
      "2025-08-10T00:00:00.000Z",
      "2025-08-10T00:00:00.000Z",
      "UTC"
    );

    expect(dates).toEqual([]);
  });

  it("handles timezone offset correctly", () => {
    // Midnight ET Aug 10 = 04:00 UTC Aug 10
    const dates = getDateSeriesInRange(
      "2025-08-10T04:00:00.000Z",
      "2025-08-12T04:00:00.000Z",
      "America/New_York"
    );

    expect(dates).toEqual(["2025-08-10", "2025-08-11"]);
  });
});
