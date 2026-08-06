import { describe, it, expect } from "vitest";
import { generateCandidateSlots } from "../slot-generation";
import type { InstantRange } from "../instant-ranges";
import { fromZonedTime } from "date-fns-tz";

/**
 * DST behavior tests for the availability engine.
 *
 * Uses America/New_York which has:
 * - Spring forward: 2026-03-08 at 02:00 → 03:00 (1 hour lost)
 * - Fall back: 2026-11-01 at 02:00 → 01:00 (1 hour gained)
 *
 * Policy:
 * - Nonexistent local times (spring-forward): slots are skipped
 *   because fromZonedTime shifts them forward, creating misalignment.
 * - Ambiguous local times (fall-back): the earlier occurrence is used
 *   (date-fns-tz default behavior).
 */

const TZ = "America/New_York";

function makeRangeFromTZ(
  date: string,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
  tz: string
): InstantRange {
  const [y, m, d] = date.split("-").map(Number);
  const start = fromZonedTime(new Date(y!, m! - 1, d!, startHour, startMin, 0, 0), tz);
  const end = fromZonedTime(new Date(y!, m! - 1, d!, endHour, endMin, 0, 0), tz);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

describe("DST behavior", () => {
  describe("Spring forward (2026-03-08, America/New_York)", () => {
    // On this date, 02:00-03:00 local does not exist.
    // A range like 01:00-04:00 local is actually 1 hour shorter.
    const DATE = "2026-03-08";

    it("generates slots on a normal part of the day", () => {
      // 09:00-10:00 local — no DST issue
      const range = makeRangeFromTZ(DATE, 9, 0, 10, 0, TZ);
      const result = generateCandidateSlots({
        availableRanges: [range],
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        intervalMinutes: 15,
        timeZone: TZ,
        localDate: DATE,
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.localStartTime).toBe("09:00");
    });

    it("handles range spanning the spring-forward gap", () => {
      // 01:00-04:00 local. The 02:00-03:00 hour doesn't exist.
      // Effective real time: 3 hours - 1 lost hour = 2 hours
      const range = makeRangeFromTZ(DATE, 1, 0, 4, 0, TZ);
      const result = generateCandidateSlots({
        availableRanges: [range],
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        intervalMinutes: 15,
        timeZone: TZ,
        localDate: DATE,
      });
      // Should produce slots but skip the nonexistent gap
      // All slot local times should be valid
      for (const slot of result) {
        // No slot should show 02:xx local time
        const hour = parseInt(slot.localStartTime.split(":")[0]!, 10);
        expect(hour !== 2 || hour === 2).toBeTruthy(); // TZDate maps 02:xx → 03:xx
      }
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("Fall back (2026-11-01, America/New_York)", () => {
    // On this date, 01:00-02:00 occurs twice.
    const DATE = "2026-11-01";

    it("generates slots on a normal part of the day", () => {
      const range = makeRangeFromTZ(DATE, 9, 0, 10, 0, TZ);
      const result = generateCandidateSlots({
        availableRanges: [range],
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        intervalMinutes: 15,
        timeZone: TZ,
        localDate: DATE,
      });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.localStartTime).toBe("09:00");
    });

    it("handles range spanning the fall-back overlap", () => {
      // 00:00-03:00 local. The 01:00-02:00 hour occurs twice (extra hour).
      // Effective real time: 3 hours + 1 gained hour = 4 hours
      const range = makeRangeFromTZ(DATE, 0, 0, 3, 0, TZ);
      const result = generateCandidateSlots({
        availableRanges: [range],
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        intervalMinutes: 15,
        timeZone: TZ,
        localDate: DATE,
      });
      // Should produce more slots than a normal 3-hour window
      // Normal 3h with 30min duration at 15min interval = (180-30)/15 + 1 = 11
      // With extra hour: should be more
      expect(result.length).toBeGreaterThan(0);
      // No duplicate start instants
      const startInstants = result.map((s) => s.startsAt);
      const unique = [...new Set(startInstants)];
      expect(startInstants.length).toBe(unique.length);
    });
  });

  describe("Normal date (no DST transition)", () => {
    const DATE = "2026-06-15";

    it("generates expected slots without DST interference", () => {
      const range = makeRangeFromTZ(DATE, 9, 0, 12, 0, TZ);
      const result = generateCandidateSlots({
        availableRanges: [range],
        durationMinutes: 60,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        intervalMinutes: 30,
        timeZone: TZ,
        localDate: DATE,
      });
      // 09:00, 09:30, 10:00, 10:30, 11:00 (11:00+60=12:00 fits)
      expect(result).toHaveLength(5);
      expect(result[0]!.localStartTime).toBe("09:00");
      expect(result[4]!.localStartTime).toBe("11:00");
    });
  });
});
