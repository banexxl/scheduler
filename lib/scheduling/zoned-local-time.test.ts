/**
 * Tests for zoned-local-time utilities — Milestone 6.8.
 */

import { describe, it, expect } from "vitest";
import {
  localDateTimeToInstantStrict,
  getTenantLocalDate,
  getTenantLocalDateTime,
} from "./zoned-local-time";

// ─── localDateTimeToInstantStrict ────────────────────────────────────────────

describe("localDateTimeToInstantStrict", () => {
  it("converts a normal local datetime to UTC instant", () => {
    // 2025-08-06 10:00 in America/New_York = 2025-08-06T14:00:00Z (EDT, UTC-4)
    const result = localDateTimeToInstantStrict("2025-08-06", "10:00", "America/New_York");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.instant.toISOString()).toBe("2025-08-06T14:00:00.000Z");
    }
  });

  it("converts UTC timezone correctly", () => {
    const result = localDateTimeToInstantStrict("2025-01-15", "09:30", "UTC");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.instant.toISOString()).toBe("2025-01-15T09:30:00.000Z");
    }
  });

  it("handles Europe/Belgrade timezone", () => {
    // 2025-08-06 14:00 in Europe/Belgrade (CET+1 = CEST, UTC+2 in summer)
    const result = localDateTimeToInstantStrict("2025-08-06", "14:00", "Europe/Belgrade");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.instant.toISOString()).toBe("2025-08-06T12:00:00.000Z");
    }
  });

  it("detects nonexistent spring-forward time", () => {
    // In America/New_York, March 9 2025: clocks spring forward from 2:00 to 3:00
    // So 2:30 AM does not exist
    const result = localDateTimeToInstantStrict("2025-03-09", "02:30", "America/New_York");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("nonexistent");
    }
  });

  it("handles fall-back ambiguous time (earlier occurrence)", () => {
    // In America/New_York, Nov 2 2025: clocks fall back from 2:00 to 1:00
    // So 1:30 AM occurs twice. date-fns-tz uses the earlier occurrence.
    const result = localDateTimeToInstantStrict("2025-11-02", "01:30", "America/New_York");

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Earlier occurrence: still in EDT (UTC-4), so 01:30 EDT = 05:30 UTC
      expect(result.instant.toISOString()).toBe("2025-11-02T05:30:00.000Z");
    }
  });

  it("rejects invalid date format", () => {
    const result = localDateTimeToInstantStrict("2025/08/06", "10:00", "UTC");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_input");
  });

  it("rejects invalid time format", () => {
    const result = localDateTimeToInstantStrict("2025-08-06", "10:00:00", "UTC");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_input");
  });

  it("rejects out-of-range month", () => {
    const result = localDateTimeToInstantStrict("2025-13-06", "10:00", "UTC");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_input");
  });

  it("rejects out-of-range hour", () => {
    const result = localDateTimeToInstantStrict("2025-08-06", "25:00", "UTC");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_input");
  });
});

// ─── getTenantLocalDate ──────────────────────────────────────────────────────

describe("getTenantLocalDate", () => {
  it("returns local date in UTC", () => {
    const now = new Date("2025-08-06T23:30:00Z");
    expect(getTenantLocalDate(now, "UTC")).toBe("2025-08-06");
  });

  it("returns correct date when UTC date differs from local date", () => {
    // UTC: Aug 7 02:00 → in America/New_York (UTC-4): Aug 6 22:00
    const now = new Date("2025-08-07T02:00:00Z");
    expect(getTenantLocalDate(now, "America/New_York")).toBe("2025-08-06");
  });

  it("returns next day for positive offset timezone", () => {
    // UTC: Aug 6 23:00 → in Asia/Tokyo (UTC+9): Aug 7 08:00
    const now = new Date("2025-08-06T23:00:00Z");
    expect(getTenantLocalDate(now, "Asia/Tokyo")).toBe("2025-08-07");
  });
});

// ─── getTenantLocalDateTime ──────────────────────────────────────────────────

describe("getTenantLocalDateTime", () => {
  it("returns both date and time", () => {
    const now = new Date("2025-08-06T14:30:00Z");
    const result = getTenantLocalDateTime(now, "UTC");

    expect(result.localDate).toBe("2025-08-06");
    expect(result.localTime).toBe("14:30");
  });

  it("handles timezone offset correctly", () => {
    // UTC 14:30 → America/New_York (UTC-4 in summer): 10:30
    const now = new Date("2025-08-06T14:30:00Z");
    const result = getTenantLocalDateTime(now, "America/New_York");

    expect(result.localDate).toBe("2025-08-06");
    expect(result.localTime).toBe("10:30");
  });
});
