import { describe, it, expect } from "vitest";
import {
  intersectTimePeriods,
  normalizeTimePeriods,
  alignLocalTimeToInterval,
  timeToMinutes,
  minutesToTime,
} from "../local-time-periods";

// ─── normalizeTimePeriods ────────────────────────────────────────────────────

describe("normalizeTimePeriods", () => {
  it("returns empty for empty input", () => {
    expect(normalizeTimePeriods([])).toEqual([]);
  });

  it("returns single period unchanged", () => {
    expect(normalizeTimePeriods([{ startTime: "09:00", endTime: "17:00" }])).toEqual([
      { startTime: "09:00", endTime: "17:00" },
    ]);
  });

  it("merges overlapping periods", () => {
    const result = normalizeTimePeriods([
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "11:00", endTime: "14:00" },
    ]);
    expect(result).toEqual([{ startTime: "09:00", endTime: "14:00" }]);
  });

  it("merges adjacent periods", () => {
    const result = normalizeTimePeriods([
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "12:00", endTime: "15:00" },
    ]);
    expect(result).toEqual([{ startTime: "09:00", endTime: "15:00" }]);
  });

  it("keeps non-overlapping periods separate", () => {
    const result = normalizeTimePeriods([
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "17:00" },
    ]);
    expect(result).toEqual([
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "17:00" },
    ]);
  });

  it("handles containment (one period inside another)", () => {
    const result = normalizeTimePeriods([
      { startTime: "08:00", endTime: "18:00" },
      { startTime: "10:00", endTime: "14:00" },
    ]);
    expect(result).toEqual([{ startTime: "08:00", endTime: "18:00" }]);
  });

  it("handles unsorted input", () => {
    const result = normalizeTimePeriods([
      { startTime: "14:00", endTime: "17:00" },
      { startTime: "09:00", endTime: "12:00" },
    ]);
    expect(result).toEqual([
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "17:00" },
    ]);
  });

  it("does not mutate input", () => {
    const input = [
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "11:00", endTime: "14:00" },
    ];
    const copy = JSON.parse(JSON.stringify(input));
    normalizeTimePeriods(input);
    expect(input).toEqual(copy);
  });
});

// ─── intersectTimePeriods ────────────────────────────────────────────────────

describe("intersectTimePeriods", () => {
  it("returns empty when left is empty", () => {
    expect(intersectTimePeriods([], [{ startTime: "09:00", endTime: "17:00" }])).toEqual([]);
  });

  it("returns empty when right is empty", () => {
    expect(intersectTimePeriods([{ startTime: "09:00", endTime: "17:00" }], [])).toEqual([]);
  });

  it("computes exact match intersection", () => {
    const result = intersectTimePeriods(
      [{ startTime: "09:00", endTime: "17:00" }],
      [{ startTime: "09:00", endTime: "17:00" }]
    );
    expect(result).toEqual([{ startTime: "09:00", endTime: "17:00" }]);
  });

  it("computes partial overlap", () => {
    const result = intersectTimePeriods(
      [{ startTime: "09:00", endTime: "17:00" }],
      [{ startTime: "08:00", endTime: "12:00" }]
    );
    expect(result).toEqual([{ startTime: "09:00", endTime: "12:00" }]);
  });

  it("computes containment (right inside left)", () => {
    const result = intersectTimePeriods(
      [{ startTime: "08:00", endTime: "18:00" }],
      [{ startTime: "10:00", endTime: "14:00" }]
    );
    expect(result).toEqual([{ startTime: "10:00", endTime: "14:00" }]);
  });

  it("computes containment (left inside right)", () => {
    const result = intersectTimePeriods(
      [{ startTime: "10:00", endTime: "14:00" }],
      [{ startTime: "08:00", endTime: "18:00" }]
    );
    expect(result).toEqual([{ startTime: "10:00", endTime: "14:00" }]);
  });

  it("handles multiple split periods", () => {
    // Location: 09:00–13:00, 14:00–18:00
    // Resource: 10:00–16:00
    // Result: 10:00–13:00, 14:00–16:00
    const result = intersectTimePeriods(
      [
        { startTime: "09:00", endTime: "13:00" },
        { startTime: "14:00", endTime: "18:00" },
      ],
      [{ startTime: "10:00", endTime: "16:00" }]
    );
    expect(result).toEqual([
      { startTime: "10:00", endTime: "13:00" },
      { startTime: "14:00", endTime: "16:00" },
    ]);
  });

  it("returns empty for no overlap", () => {
    const result = intersectTimePeriods(
      [{ startTime: "09:00", endTime: "12:00" }],
      [{ startTime: "13:00", endTime: "17:00" }]
    );
    expect(result).toEqual([]);
  });

  it("returns empty for adjacent periods (touching but not overlapping)", () => {
    const result = intersectTimePeriods(
      [{ startTime: "09:00", endTime: "12:00" }],
      [{ startTime: "12:00", endTime: "15:00" }]
    );
    expect(result).toEqual([]);
  });

  it("handles multiple periods on both sides", () => {
    const result = intersectTimePeriods(
      [
        { startTime: "08:00", endTime: "10:00" },
        { startTime: "12:00", endTime: "14:00" },
        { startTime: "16:00", endTime: "18:00" },
      ],
      [
        { startTime: "09:00", endTime: "13:00" },
        { startTime: "15:00", endTime: "17:00" },
      ]
    );
    expect(result).toEqual([
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "12:00", endTime: "13:00" },
      { startTime: "16:00", endTime: "17:00" },
    ]);
  });

  it("does not mutate inputs", () => {
    const left = [{ startTime: "09:00", endTime: "17:00" }];
    const right = [{ startTime: "10:00", endTime: "15:00" }];
    const leftCopy = JSON.parse(JSON.stringify(left));
    const rightCopy = JSON.parse(JSON.stringify(right));
    intersectTimePeriods(left, right);
    expect(left).toEqual(leftCopy);
    expect(right).toEqual(rightCopy);
  });
});

// ─── alignLocalTimeToInterval ────────────────────────────────────────────────

describe("alignLocalTimeToInterval", () => {
  it("returns same time when already aligned", () => {
    expect(alignLocalTimeToInterval("09:00", 15)).toBe("09:00");
    expect(alignLocalTimeToInterval("09:30", 15)).toBe("09:30");
    expect(alignLocalTimeToInterval("10:00", 5)).toBe("10:00");
  });

  it("aligns up to next interval boundary", () => {
    expect(alignLocalTimeToInterval("09:07", 15)).toBe("09:15");
    expect(alignLocalTimeToInterval("09:01", 15)).toBe("09:15");
    expect(alignLocalTimeToInterval("09:14", 15)).toBe("09:15");
  });

  it("aligns with 5-minute interval", () => {
    expect(alignLocalTimeToInterval("09:01", 5)).toBe("09:05");
    expect(alignLocalTimeToInterval("09:03", 5)).toBe("09:05");
  });

  it("aligns with 30-minute interval", () => {
    expect(alignLocalTimeToInterval("09:01", 30)).toBe("09:30");
    expect(alignLocalTimeToInterval("09:31", 30)).toBe("10:00");
  });

  it("handles midnight alignment", () => {
    expect(alignLocalTimeToInterval("00:00", 15)).toBe("00:00");
  });

  it("handles late time alignment", () => {
    expect(alignLocalTimeToInterval("23:50", 15)).toBe("24:00");
  });
});

// ─── timeToMinutes / minutesToTime ───────────────────────────────────────────

describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts 09:30 to 570", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });

  it("converts 23:59 to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToTime", () => {
  it("converts 0 to 00:00", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("converts 570 to 09:30", () => {
    expect(minutesToTime(570)).toBe("09:30");
  });

  it("converts 1439 to 23:59", () => {
    expect(minutesToTime(1439)).toBe("23:59");
  });
});
