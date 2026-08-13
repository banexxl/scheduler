import { describe, it, expect } from "vitest";
import { differenceInDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { format, addDays, addWeeks, addMonths, startOfWeek, startOfMonth } from "date-fns";

/**
 * Utilization & Trend Tests — Milestone 15.9.1.
 */

// Mirror of mergeOverlappingIntervals from utilization-service.ts (server-only)
type TimeInterval = { start: number; end: number };

function mergeOverlappingIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length <= 1) return intervals;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const result: TimeInterval[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = result[result.length - 1]!;
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      result.push(current);
    }
  }
  return result;
}

// Mirror of selectBucketGranularity and generateBucketKeys (server-only)
type TrendBucket = "day" | "week" | "month";

function selectBucketGranularity(rangeStart: string, rangeEnd: string): TrendBucket {
  const days = differenceInDays(new Date(rangeEnd), new Date(rangeStart));
  if (days <= 90) return "day";
  if (days <= 365) return "week";
  return "month";
}

function generateBucketKeys(rangeStart: string, rangeEnd: string, bucket: TrendBucket, timeZone: string): string[] {
  const keys: string[] = [];
  const start = toZonedTime(new Date(rangeStart), timeZone);
  const end = toZonedTime(new Date(rangeEnd), timeZone);
  let current = start;
  const maxBuckets = 400;
  let count = 0;
  while (current < end && count < maxBuckets) {
    count++;
    switch (bucket) {
      case "day": keys.push(format(current, "yyyy-MM-dd")); current = addDays(current, 1); break;
      case "week": keys.push(format(startOfWeek(current, { weekStartsOn: 1 }), "yyyy-MM-dd")); current = addWeeks(current, 1); break;
      case "month": keys.push(format(startOfMonth(current), "yyyy-MM")); current = addMonths(current, 1); break;
    }
  }
  return [...new Set(keys)];
}

/**
 * Utilization & Trend Tests — Milestone 15.9.1.
 */

describe("mergeOverlappingIntervals", () => {
  it("merges overlapping intervals", () => {
    const result = mergeOverlappingIntervals([
      { start: 720, end: 840 },  // 12:00-14:00
      { start: 780, end: 900 },  // 13:00-15:00
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 720, end: 900 }); // 12:00-15:00
  });

  it("keeps non-overlapping intervals separate", () => {
    const result = mergeOverlappingIntervals([
      { start: 540, end: 600 },  // 09:00-10:00
      { start: 720, end: 780 },  // 12:00-13:00
    ]);
    expect(result).toHaveLength(2);
  });

  it("merges adjacent intervals", () => {
    const result = mergeOverlappingIntervals([
      { start: 540, end: 600 },
      { start: 600, end: 660 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 540, end: 660 });
  });

  it("handles single interval", () => {
    const result = mergeOverlappingIntervals([{ start: 0, end: 60 }]);
    expect(result).toHaveLength(1);
  });

  it("handles empty array", () => {
    expect(mergeOverlappingIntervals([])).toHaveLength(0);
  });

  it("merges three overlapping into one", () => {
    const result = mergeOverlappingIntervals([
      { start: 100, end: 200 },
      { start: 150, end: 250 },
      { start: 200, end: 300 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 100, end: 300 });
  });

  it("correctly handles contained interval", () => {
    const result = mergeOverlappingIntervals([
      { start: 100, end: 400 },
      { start: 200, end: 300 }, // contained within first
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ start: 100, end: 400 });
  });
});

describe("selectBucketGranularity", () => {
  it("returns day for 7 day range", () => {
    expect(selectBucketGranularity("2026-01-01T00:00:00Z", "2026-01-08T00:00:00Z")).toBe("day");
  });

  it("returns day for 30 day range", () => {
    expect(selectBucketGranularity("2026-01-01T00:00:00Z", "2026-01-31T00:00:00Z")).toBe("day");
  });

  it("returns day for 90 day range", () => {
    expect(selectBucketGranularity("2026-01-01T00:00:00Z", "2026-04-01T00:00:00Z")).toBe("day");
  });

  it("returns week for 180 day range", () => {
    expect(selectBucketGranularity("2026-01-01T00:00:00Z", "2026-07-01T00:00:00Z")).toBe("week");
  });

  it("returns month for >365 day range", () => {
    expect(selectBucketGranularity("2024-01-01T00:00:00Z", "2026-01-01T00:00:00Z")).toBe("month");
  });
});

describe("generateBucketKeys", () => {
  it("generates daily keys for short range", () => {
    const keys = generateBucketKeys("2026-01-01T00:00:00Z", "2026-01-04T00:00:00Z", "day", "UTC");
    expect(keys).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });

  it("generates monthly keys for long range", () => {
    const keys = generateBucketKeys("2026-01-01T00:00:00Z", "2026-04-01T00:00:00Z", "month", "UTC");
    expect(keys).toContain("2026-01");
    expect(keys).toContain("2026-02");
    expect(keys).toContain("2026-03");
  });

  it("returns empty for same start/end", () => {
    const keys = generateBucketKeys("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z", "day", "UTC");
    expect(keys).toHaveLength(0);
  });

  it("bounds output to 400 max", () => {
    const keys = generateBucketKeys("2020-01-01T00:00:00Z", "2026-01-01T00:00:00Z", "day", "UTC");
    expect(keys.length).toBeLessThanOrEqual(400);
  });

  it("deduplicates weekly keys", () => {
    const keys = generateBucketKeys("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", "week", "UTC");
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
