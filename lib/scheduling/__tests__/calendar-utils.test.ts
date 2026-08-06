import { describe, it, expect } from "vitest";
import {
  getTenantDayRange,
  getTenantDayDurationMinutes,
  getTenantWeekDates,
  getTenantWeekRange,
  addTenantLocalDays,
  getTenantToday,
  getTenantCurrentMinutes,
  minutesFromCalendarStart,
  minutesToPixelOffset,
  durationToPixelHeight,
  getCalendarTotalMinutes,
  getCalendarTotalHeight,
  getAppointmentBlockPosition,
  getTimeAxisLabels,
  resolveCalendarBounds,
  DEFAULT_CALENDAR_CONFIG,
} from "../calendar-utils";

// ─── getTenantDayRange ───────────────────────────────────────────────────────

describe("getTenantDayRange", () => {
  it("returns correct UTC range for a normal date in UTC", () => {
    const range = getTenantDayRange("2026-08-06", "UTC");
    expect(range.start).toBe("2026-08-06T00:00:00.000Z");
    expect(range.end).toBe("2026-08-07T00:00:00.000Z");
  });

  it("returns correct UTC range for Europe/Bucharest (UTC+3 in summer)", () => {
    const range = getTenantDayRange("2026-08-06", "Europe/Bucharest");
    // Bucharest is UTC+3 in August (EEST)
    // Local midnight = 21:00 UTC previous day
    expect(range.start).toBe("2026-08-05T21:00:00.000Z");
    expect(range.end).toBe("2026-08-06T21:00:00.000Z");
  });

  it("returns correct UTC range for America/New_York (UTC-4 in summer)", () => {
    const range = getTenantDayRange("2026-08-06", "America/New_York");
    // NYC is UTC-4 in August (EDT)
    // Local midnight = 04:00 UTC same day
    expect(range.start).toBe("2026-08-06T04:00:00.000Z");
    expect(range.end).toBe("2026-08-07T04:00:00.000Z");
  });

  it("handles DST spring-forward day (23 hours)", () => {
    // March 8, 2026: US spring forward at 2:00 AM
    const range = getTenantDayRange("2026-03-08", "America/New_York");
    const startMs = new Date(range.start).getTime();
    const endMs = new Date(range.end).getTime();
    const hours = (endMs - startMs) / (60 * 60 * 1000);
    expect(hours).toBe(23);
  });

  it("handles DST fall-back day (25 hours)", () => {
    // November 1, 2026: US fall back at 2:00 AM
    const range = getTenantDayRange("2026-11-01", "America/New_York");
    const startMs = new Date(range.start).getTime();
    const endMs = new Date(range.end).getTime();
    const hours = (endMs - startMs) / (60 * 60 * 1000);
    expect(hours).toBe(25);
  });
});

// ─── getTenantDayDurationMinutes ─────────────────────────────────────────────

describe("getTenantDayDurationMinutes", () => {
  it("normal day is 1440 minutes", () => {
    expect(getTenantDayDurationMinutes("2026-08-06", "UTC")).toBe(1440);
  });

  it("spring-forward day is 1380 minutes (23 hours)", () => {
    expect(getTenantDayDurationMinutes("2026-03-08", "America/New_York")).toBe(1380);
  });

  it("fall-back day is 1500 minutes (25 hours)", () => {
    expect(getTenantDayDurationMinutes("2026-11-01", "America/New_York")).toBe(1500);
  });
});

// ─── getTenantWeekDates ──────────────────────────────────────────────────────

describe("getTenantWeekDates", () => {
  it("returns 7 dates starting Monday for a Wednesday", () => {
    // 2026-08-05 is a Wednesday
    const dates = getTenantWeekDates("2026-08-05", "UTC");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-08-03"); // Monday
    expect(dates[6]).toBe("2026-08-09"); // Sunday
  });

  it("returns 7 dates starting Monday for a Monday", () => {
    const dates = getTenantWeekDates("2026-08-03", "UTC");
    expect(dates[0]).toBe("2026-08-03");
    expect(dates[6]).toBe("2026-08-09");
  });

  it("returns 7 dates starting Monday for a Sunday", () => {
    const dates = getTenantWeekDates("2026-08-09", "UTC");
    expect(dates[0]).toBe("2026-08-03");
    expect(dates[6]).toBe("2026-08-09");
  });

  it("handles week crossing month boundary", () => {
    // 2026-08-31 is Monday
    const dates = getTenantWeekDates("2026-09-02", "UTC");
    expect(dates[0]).toBe("2026-08-31");
    expect(dates[6]).toBe("2026-09-06");
  });
});

// ─── getTenantWeekRange ──────────────────────────────────────────────────────

describe("getTenantWeekRange", () => {
  it("returns UTC range covering full week", () => {
    const range = getTenantWeekRange("2026-08-05", "UTC");
    expect(range.start).toBe("2026-08-03T00:00:00.000Z");
    expect(range.end).toBe("2026-08-10T00:00:00.000Z");
  });

  it("week range respects timezone offset", () => {
    const range = getTenantWeekRange("2026-08-05", "America/New_York");
    // Monday midnight EDT = 04:00 UTC
    expect(range.start).toBe("2026-08-03T04:00:00.000Z");
    // Next Monday midnight EDT = 04:00 UTC
    expect(range.end).toBe("2026-08-10T04:00:00.000Z");
  });
});

// ─── addTenantLocalDays ──────────────────────────────────────────────────────

describe("addTenantLocalDays", () => {
  it("adds one day", () => {
    expect(addTenantLocalDays("2026-08-06", 1)).toBe("2026-08-07");
  });

  it("subtracts one day", () => {
    expect(addTenantLocalDays("2026-08-06", -1)).toBe("2026-08-05");
  });

  it("adds 7 days", () => {
    expect(addTenantLocalDays("2026-08-03", 7)).toBe("2026-08-10");
  });

  it("handles month boundary", () => {
    expect(addTenantLocalDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("handles year boundary", () => {
    expect(addTenantLocalDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles Feb 28 to Mar 1 in non-leap year", () => {
    expect(addTenantLocalDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

// ─── getTenantToday ──────────────────────────────────────────────────────────

describe("getTenantToday", () => {
  it("returns correct local date for UTC", () => {
    const now = new Date("2026-08-06T23:30:00Z");
    expect(getTenantToday(now, "UTC")).toBe("2026-08-06");
  });

  it("returns next day for timezone ahead of UTC", () => {
    // 23:30 UTC = 02:30 next day in Bucharest (UTC+3)
    const now = new Date("2026-08-06T23:30:00Z");
    expect(getTenantToday(now, "Europe/Bucharest")).toBe("2026-08-07");
  });

  it("returns same day for timezone behind UTC", () => {
    // 03:30 UTC = 23:30 previous day in NYC (UTC-4)
    const now = new Date("2026-08-06T03:30:00Z");
    expect(getTenantToday(now, "America/New_York")).toBe("2026-08-05");
  });
});

// ─── getTenantCurrentMinutes ─────────────────────────────────────────────────

describe("getTenantCurrentMinutes", () => {
  it("returns 0 at local midnight", () => {
    // Midnight UTC in UTC timezone
    const now = new Date("2026-08-06T00:00:00Z");
    expect(getTenantCurrentMinutes(now, "UTC")).toBe(0);
  });

  it("returns 630 at 10:30 local", () => {
    // 10:30 UTC in UTC timezone
    const now = new Date("2026-08-06T10:30:00Z");
    expect(getTenantCurrentMinutes(now, "UTC")).toBe(630);
  });

  it("adjusts for timezone", () => {
    // 14:00 UTC = 10:00 EDT (UTC-4)
    const now = new Date("2026-08-06T14:00:00Z");
    expect(getTenantCurrentMinutes(now, "America/New_York")).toBe(600);
  });
});

// ─── Positioning Utilities ───────────────────────────────────────────────────

describe("minutesFromCalendarStart", () => {
  it("returns 0 for appointment at start hour", () => {
    // 07:00 UTC in UTC timezone, startHour = 7
    const result = minutesFromCalendarStart("2026-08-06T07:00:00Z", "2026-08-06", "UTC", 7);
    expect(result).toBe(0);
  });

  it("returns 60 for appointment 1 hour after start", () => {
    const result = minutesFromCalendarStart("2026-08-06T08:00:00Z", "2026-08-06", "UTC", 7);
    expect(result).toBe(60);
  });

  it("returns negative for appointment before start hour", () => {
    const result = minutesFromCalendarStart("2026-08-06T06:30:00Z", "2026-08-06", "UTC", 7);
    expect(result).toBe(-30);
  });

  it("handles timezone conversion", () => {
    // 11:00 UTC = 07:00 EDT
    const result = minutesFromCalendarStart("2026-08-06T11:00:00Z", "2026-08-06", "America/New_York", 7);
    expect(result).toBe(0);
  });
});

describe("minutesToPixelOffset", () => {
  it("converts minutes to pixels at default rate", () => {
    expect(minutesToPixelOffset(60, 1.2)).toBe(72);
  });

  it("returns 0 for negative minutes", () => {
    expect(minutesToPixelOffset(-10, 1.2)).toBe(0);
  });

  it("returns 0 for 0 minutes", () => {
    expect(minutesToPixelOffset(0, 1.2)).toBe(0);
  });
});

describe("durationToPixelHeight", () => {
  it("converts duration to height at default rate", () => {
    expect(durationToPixelHeight(60, 1.2, 24)).toBe(72);
  });

  it("enforces minimum height for short durations", () => {
    expect(durationToPixelHeight(5, 1.2, 24)).toBe(24);
  });

  it("uses actual height when above minimum", () => {
    expect(durationToPixelHeight(30, 1.2, 24)).toBe(36);
  });
});

// ─── getCalendarTotalMinutes / getCalendarTotalHeight ─────────────────────────

describe("getCalendarTotalMinutes", () => {
  it("returns 840 for 7-21 range (14 hours)", () => {
    expect(getCalendarTotalMinutes(7, 21)).toBe(840);
  });

  it("returns 720 for 8-20 range (12 hours)", () => {
    expect(getCalendarTotalMinutes(8, 20)).toBe(720);
  });
});

describe("getCalendarTotalHeight", () => {
  it("returns correct height for default config", () => {
    expect(getCalendarTotalHeight(DEFAULT_CALENDAR_CONFIG)).toBe(840 * 1.2);
  });
});

// ─── getAppointmentBlockPosition ─────────────────────────────────────────────

describe("getAppointmentBlockPosition", () => {
  const config = { ...DEFAULT_CALENDAR_CONFIG }; // startHour: 7, endHour: 21, ppm: 1.2, minH: 24

  it("positions appointment starting at grid start", () => {
    const pos = getAppointmentBlockPosition(
      "2026-08-06T07:00:00Z", "2026-08-06T08:00:00Z",
      "2026-08-06", "UTC", config
    );
    expect(pos.top).toBe(0);
    expect(pos.height).toBe(60 * 1.2); // 72px for 60 min
    expect(pos.clippedTop).toBe(false);
    expect(pos.clippedBottom).toBe(false);
  });

  it("positions appointment in the middle", () => {
    const pos = getAppointmentBlockPosition(
      "2026-08-06T10:00:00Z", "2026-08-06T10:30:00Z",
      "2026-08-06", "UTC", config
    );
    expect(pos.top).toBe(180 * 1.2); // 3 hours * 60 min * 1.2 ppm
    expect(pos.height).toBe(30 * 1.2); // 30 min
  });

  it("clips appointment starting before grid", () => {
    const pos = getAppointmentBlockPosition(
      "2026-08-06T06:00:00Z", "2026-08-06T08:00:00Z",
      "2026-08-06", "UTC", config
    );
    expect(pos.top).toBe(0);
    expect(pos.clippedTop).toBe(true);
    // Effective duration: from grid start (07:00) to 08:00 = 60 min
    expect(pos.height).toBe(60 * 1.2);
  });

  it("clips appointment ending after grid", () => {
    const pos = getAppointmentBlockPosition(
      "2026-08-06T20:00:00Z", "2026-08-06T22:00:00Z",
      "2026-08-06", "UTC", config
    );
    expect(pos.clippedBottom).toBe(true);
    // Effective: from 20:00 to 21:00 (grid end) = 60 min
    expect(pos.height).toBe(60 * 1.2);
  });

  it("enforces minimum height for very short appointments", () => {
    const pos = getAppointmentBlockPosition(
      "2026-08-06T10:00:00Z", "2026-08-06T10:05:00Z",
      "2026-08-06", "UTC", config
    );
    // 5 min * 1.2 = 6px, but min is 24
    expect(pos.height).toBe(24);
  });
});

// ─── getTimeAxisLabels ───────────────────────────────────────────────────────

describe("getTimeAxisLabels", () => {
  it("generates labels for default config (7-21)", () => {
    const labels = getTimeAxisLabels(DEFAULT_CALENDAR_CONFIG);
    expect(labels).toHaveLength(14); // 7,8,9,...,20
    expect(labels[0]!.hour).toBe(7);
    expect(labels[0]!.label).toBe("07:00");
    expect(labels[0]!.offsetPx).toBe(0);
    expect(labels[1]!.hour).toBe(8);
    expect(labels[1]!.offsetPx).toBe(60 * 1.2);
    expect(labels[13]!.hour).toBe(20);
  });
});

// ─── resolveCalendarBounds ───────────────────────────────────────────────────

describe("resolveCalendarBounds", () => {
  it("returns defaults when no appointments", () => {
    const bounds = resolveCalendarBounds([], "2026-08-06", "UTC");
    expect(bounds.startHour).toBe(7);
    expect(bounds.endHour).toBe(21);
  });

  it("expands start when appointment is before default start", () => {
    const bounds = resolveCalendarBounds(
      [{ startsAt: "2026-08-06T05:30:00Z", endsAt: "2026-08-06T06:30:00Z" }],
      "2026-08-06", "UTC"
    );
    expect(bounds.startHour).toBe(5);
    expect(bounds.endHour).toBe(21);
  });

  it("expands end when appointment is after default end", () => {
    const bounds = resolveCalendarBounds(
      [{ startsAt: "2026-08-06T21:30:00Z", endsAt: "2026-08-06T22:30:00Z" }],
      "2026-08-06", "UTC"
    );
    expect(bounds.startHour).toBe(7);
    expect(bounds.endHour).toBe(23);
  });

  it("does not shrink below defaults", () => {
    const bounds = resolveCalendarBounds(
      [{ startsAt: "2026-08-06T10:00:00Z", endsAt: "2026-08-06T11:00:00Z" }],
      "2026-08-06", "UTC"
    );
    expect(bounds.startHour).toBe(7);
    expect(bounds.endHour).toBe(21);
  });
});
