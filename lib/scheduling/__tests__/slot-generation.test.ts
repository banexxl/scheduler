import { describe, it, expect } from "vitest";
import { generateCandidateSlots } from "../slot-generation";
import type { InstantRange } from "../instant-ranges";

// Use a fixed UTC date for predictability (no DST in UTC)
const DATE = "2026-06-15";
const TZ = "UTC";

function makeRange(startHour: number, startMin: number, endHour: number, endMin: number): InstantRange {
  const s = `2026-06-15T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00.000Z`;
  const e = `2026-06-15T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00.000Z`;
  return { start: s, end: e };
}

describe("generateCandidateSlots", () => {
  it("returns empty for empty ranges", () => {
    const result = generateCandidateSlots({
      availableRanges: [],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    expect(result).toEqual([]);
  });

  it("returns empty when duration is zero", () => {
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 17, 0)],
      durationMinutes: 0,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    expect(result).toEqual([]);
  });

  it("generates correct slots for exact fit (30min in 30min window)", () => {
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 9, 30)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.localStartTime).toBe("09:00");
    expect(result[0]!.localEndTime).toBe("09:30");
  });

  it("returns empty when one minute too short", () => {
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 9, 29)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    expect(result).toEqual([]);
  });

  it("handles zero buffers correctly", () => {
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 10, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    // 09:00, 09:15, 09:30 (09:30+30=10:00 fits)
    expect(result).toHaveLength(3);
    expect(result[0]!.localStartTime).toBe("09:00");
    expect(result[1]!.localStartTime).toBe("09:15");
    expect(result[2]!.localStartTime).toBe("09:30");
  });

  it("respects buffer before (reduces valid starts)", () => {
    // Available: 09:00-10:00, duration 30, bufferBefore 10
    // Occupied start = serviceStart - 10. Must be >= 09:00.
    // So serviceStart >= 09:10. First aligned at 15-min: 09:15
    // 09:15: occupied 09:05-09:45 — occupied start 09:05 < 09:00? No 09:05 >= 09:00. Wait:
    // Actually: occupiedStart = 09:15 - 10min = 09:05. 09:05 >= 09:00? Yes.
    // occupiedEnd = 09:15 + 30 = 09:45. 09:45 <= 10:00? Yes. Valid.
    // Next: 09:30. occupied: 09:20 - 10:00. Fits.
    // Next: 09:45. occupied: 09:35 - 10:15. 10:15 > 10:00. Doesn't fit.
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 10, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    // 09:00 → occupied 08:50-09:30 → 08:50 < 09:00 INVALID
    // 09:15 → occupied 09:05-09:45 → fits
    // 09:30 → occupied 09:20-10:00 → fits
    // 09:45 → occupied 09:35-10:15 → 10:15 > 10:00 INVALID
    expect(result).toHaveLength(2);
    expect(result[0]!.localStartTime).toBe("09:15");
    expect(result[1]!.localStartTime).toBe("09:30");
  });

  it("respects buffer after", () => {
    // Available: 09:00-10:00, duration 30, bufferAfter 10
    // 09:00: service end 09:30, occupied end 09:40. Fits.
    // 09:15: service end 09:45, occupied end 09:55. Fits.
    // 09:30: service end 10:00, occupied end 10:10. > 10:00. INVALID.
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 10, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 10,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.localStartTime).toBe("09:00");
    expect(result[1]!.localStartTime).toBe("09:15");
  });

  it("respects both buffers together", () => {
    // Available: 09:00-10:00, duration 30, before 10, after 10
    // Total occupied = 10+30+10 = 50 min
    // Earliest service start = 09:00 + bufferBefore(10) = 09:10 (aligned to 5-min grid)
    // 09:10: occStart=09:00, serviceEnd=09:40, occEnd=09:50. Fits in [09:00,10:00)
    // 09:15: occStart=09:05, serviceEnd=09:45, occEnd=09:55. Fits.
    // 09:20: occStart=09:10, serviceEnd=09:50, occEnd=10:00. Fits (half-open: end==rangeEnd is ok).
    // 09:25: occStart=09:15, serviceEnd=09:55, occEnd=10:05. 10:05 > 10:00. INVALID.
    const result5 = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 10, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      intervalMinutes: 5,
      timeZone: TZ,
      localDate: DATE,
    });
    expect(result5).toHaveLength(3);
    expect(result5[0]!.localStartTime).toBe("09:10");
    expect(result5[1]!.localStartTime).toBe("09:15");
    expect(result5[2]!.localStartTime).toBe("09:20");
  });

  it("handles split shifts (multiple available ranges)", () => {
    const result = generateCandidateSlots({
      availableRanges: [
        makeRange(9, 0, 10, 0),
        makeRange(14, 0, 15, 0),
      ],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    // Range 1: 09:00, 09:15, 09:30
    // Range 2: 14:00, 14:15, 14:30
    expect(result).toHaveLength(6);
    expect(result[0]!.localStartTime).toBe("09:00");
    expect(result[3]!.localStartTime).toBe("14:00");
  });

  it("uses non-duration-based interval", () => {
    // Duration 60min, interval 15min
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 12, 0)],
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    // 09:00, 09:15, 09:30, ..., 11:00 (11:00+60=12:00 fits)
    // That's 9 slots
    expect(result).toHaveLength(9);
    expect(result[0]!.localStartTime).toBe("09:00");
    expect(result[8]!.localStartTime).toBe("11:00");
  });

  it("filters past slots when now is provided (current date)", () => {
    const now = new Date("2026-06-15T10:00:00.000Z");
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 12, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
      now,
    });
    // Slots starting before 10:00 are excluded
    // First valid: 10:00
    expect(result[0]!.localStartTime).toBe("10:00");
    expect(result.every((s) => new Date(s.startsAt).getTime() >= now.getTime())).toBe(true);
  });

  it("returns empty for past date", () => {
    const now = new Date("2026-06-16T10:00:00.000Z");
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 17, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE, // 2026-06-15, now is 2026-06-16
      now,
    });
    expect(result).toEqual([]);
  });

  it("does not filter for future date", () => {
    const now = new Date("2026-06-14T10:00:00.000Z");
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 10, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE, // 2026-06-15, now is 2026-06-14
      now,
    });
    // All slots should be present
    expect(result).toHaveLength(3);
    expect(result[0]!.localStartTime).toBe("09:00");
  });

  it("prevents duplicate slot starts", () => {
    // Two adjacent ranges that could produce the same start
    const result = generateCandidateSlots({
      availableRanges: [
        makeRange(9, 0, 10, 0),
        makeRange(9, 0, 10, 0), // duplicate range
      ],
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    // Should not have duplicate starts
    const starts = result.map((s) => s.localStartTime);
    const unique = [...new Set(starts)];
    expect(starts).toEqual(unique);
  });

  it("occupied window includes buffers in output", () => {
    const result = generateCandidateSlots({
      availableRanges: [makeRange(9, 0, 11, 0)],
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      intervalMinutes: 15,
      timeZone: TZ,
      localDate: DATE,
    });
    // First valid slot: 09:15 (occupied 09:05, but 09:10 at 5-min would be first)
    // With 15-min interval: 09:15 → occupied 09:05–09:55
    const slot = result[0]!;
    expect(slot.localStartTime).toBe("09:15");
    // Occupied start should be 10 min before service start
    const serviceStart = new Date(slot.startsAt).getTime();
    const occStart = new Date(slot.occupiedWindowStartsAt).getTime();
    const occEnd = new Date(slot.occupiedWindowEndsAt).getTime();
    expect(serviceStart - occStart).toBe(10 * 60_000);
    expect(occEnd - serviceStart).toBe((30 + 10) * 60_000);
  });
});
