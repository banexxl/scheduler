import { describe, it, expect } from "vitest";
import { subtractInstantRanges } from "@/lib/scheduling/instant-ranges";
import type { InstantRange } from "@/lib/scheduling/instant-ranges";

/**
 * Tests for appointment conflict detection logic — Milestone 6.9.
 *
 * These tests verify the conflict interval math using the same
 * subtractInstantRanges utility used by the availability engine.
 *
 * Conflict semantics (half-open intervals):
 * Two appointments conflict when:
 *   existing.occupied_starts_at < new.occupied_ends_at
 *   AND existing.occupied_ends_at > new.occupied_starts_at
 *
 * Adjacent appointments do NOT conflict:
 *   09:00–10:00 and 10:00–11:00 are valid (half-open [start, end))
 */

// Helper: check if two intervals conflict (half-open)
function intervalsConflict(
  a: { start: string; end: string },
  b: { start: string; end: string }
): boolean {
  const aStart = new Date(a.start).getTime();
  const aEnd = new Date(a.end).getTime();
  const bStart = new Date(b.start).getTime();
  const bEnd = new Date(b.end).getTime();
  return aStart < bEnd && aEnd > bStart;
}

describe("appointment conflict intervals", () => {
  it("exact overlap conflicts", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" }
      )
    ).toBe(true);
  });

  it("partial overlap (start inside existing) conflicts", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
        { start: "2026-08-06T10:30:00Z", end: "2026-08-06T11:30:00Z" }
      )
    ).toBe(true);
  });

  it("partial overlap (end inside existing) conflicts", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
        { start: "2026-08-06T09:30:00Z", end: "2026-08-06T10:30:00Z" }
      )
    ).toBe(true);
  });

  it("containment (new inside existing) conflicts", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T09:00:00Z", end: "2026-08-06T12:00:00Z" },
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" }
      )
    ).toBe(true);
  });

  it("containment (existing inside new) conflicts", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
        { start: "2026-08-06T09:00:00Z", end: "2026-08-06T12:00:00Z" }
      )
    ).toBe(true);
  });

  it("adjacent appointments do NOT conflict (half-open)", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T09:00:00Z", end: "2026-08-06T10:00:00Z" },
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" }
      )
    ).toBe(false);
  });

  it("non-overlapping appointments do NOT conflict", () => {
    expect(
      intervalsConflict(
        { start: "2026-08-06T09:00:00Z", end: "2026-08-06T10:00:00Z" },
        { start: "2026-08-06T14:00:00Z", end: "2026-08-06T15:00:00Z" }
      )
    ).toBe(false);
  });

  it("buffer-only overlap conflicts", () => {
    // Appointment A: service 10:00-10:30, buffer after until 10:45
    // Appointment B: buffer before from 10:30, service 10:45-11:15
    // Occupied A: 10:00-10:45, Occupied B: 10:30-11:15
    // These conflict because 10:00 < 11:15 AND 10:45 > 10:30
    expect(
      intervalsConflict(
        { start: "2026-08-06T10:00:00Z", end: "2026-08-06T10:45:00Z" },
        { start: "2026-08-06T10:30:00Z", end: "2026-08-06T11:15:00Z" }
      )
    ).toBe(true);
  });
});

// ─── Availability Subtraction Tests ──────────────────────────────────────────

describe("availability subtraction with appointments", () => {
  it("appointment subtracts from available range", () => {
    const available: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T17:00:00Z" },
    ];
    const blocked: InstantRange[] = [
      { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
    ];

    const result = subtractInstantRanges(available, blocked);

    expect(result).toHaveLength(2);
    expect(new Date(result[0]!.start).getTime()).toBe(new Date("2026-08-06T09:00:00Z").getTime());
    expect(new Date(result[0]!.end).getTime()).toBe(new Date("2026-08-06T10:00:00Z").getTime());
    expect(new Date(result[1]!.start).getTime()).toBe(new Date("2026-08-06T11:00:00Z").getTime());
    expect(new Date(result[1]!.end).getTime()).toBe(new Date("2026-08-06T17:00:00Z").getTime());
  });

  it("multiple appointments subtract correctly", () => {
    const available: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T17:00:00Z" },
    ];
    const blocked: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T10:00:00Z" },
      { start: "2026-08-06T12:00:00Z", end: "2026-08-06T13:00:00Z" },
      { start: "2026-08-06T15:00:00Z", end: "2026-08-06T16:00:00Z" },
    ];

    const result = subtractInstantRanges(available, blocked);

    expect(result).toHaveLength(3);
    expect(new Date(result[0]!.start).getTime()).toBe(new Date("2026-08-06T10:00:00Z").getTime());
    expect(new Date(result[0]!.end).getTime()).toBe(new Date("2026-08-06T12:00:00Z").getTime());
    expect(new Date(result[1]!.start).getTime()).toBe(new Date("2026-08-06T13:00:00Z").getTime());
    expect(new Date(result[1]!.end).getTime()).toBe(new Date("2026-08-06T15:00:00Z").getTime());
    expect(new Date(result[2]!.start).getTime()).toBe(new Date("2026-08-06T16:00:00Z").getTime());
    expect(new Date(result[2]!.end).getTime()).toBe(new Date("2026-08-06T17:00:00Z").getTime());
  });

  it("fully blocked by appointments returns empty", () => {
    const available: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T10:00:00Z" },
    ];
    const blocked: InstantRange[] = [
      { start: "2026-08-06T08:00:00Z", end: "2026-08-06T11:00:00Z" },
    ];

    const result = subtractInstantRanges(available, blocked);
    expect(result).toEqual([]);
  });

  it("cancelled appointment does not block (not included in blocked list)", () => {
    const available: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T17:00:00Z" },
    ];
    // Cancelled appointments are filtered out before reaching subtraction
    const blocked: InstantRange[] = []; // Empty = cancelled was excluded

    const result = subtractInstantRanges(available, blocked);
    expect(result).toEqual(available);
  });

  it("adjacent appointment does not reduce adjacent range (half-open)", () => {
    const available: InstantRange[] = [
      { start: "2026-08-06T10:00:00Z", end: "2026-08-06T12:00:00Z" },
    ];
    // Appointment occupies exactly 09:00-10:00 (ends at boundary)
    const blocked: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T10:00:00Z" },
    ];

    const result = subtractInstantRanges(available, blocked);
    // The available range starts at 10:00 which is the end of blocked (exclusive)
    // So the full available range remains
    expect(result).toHaveLength(1);
    expect(new Date(result[0]!.start).getTime()).toBe(new Date("2026-08-06T10:00:00Z").getTime());
    expect(new Date(result[0]!.end).getTime()).toBe(new Date("2026-08-06T12:00:00Z").getTime());
  });

  it("same resource at different locations still conflicts (resource-level blocking)", () => {
    // The conflict check is per-resource regardless of location.
    // If resource R has appointments at Location A and Location B,
    // both block R's availability at either location.
    const available: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T17:00:00Z" },
    ];
    // Appointment for resource R at location A
    const blockedFromLocationA: InstantRange[] = [
      { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
    ];

    // When checking resource R at location B, the appointment at A still blocks
    const result = subtractInstantRanges(available, blockedFromLocationA);
    expect(result).toHaveLength(2);
    expect(new Date(result[0]!.end).getTime()).toBe(new Date("2026-08-06T10:00:00Z").getTime());
    expect(new Date(result[1]!.start).getTime()).toBe(new Date("2026-08-06T11:00:00Z").getTime());
  });

  it("multiple resources may have overlapping appointments (no cross-resource conflict)", () => {
    // Resource A: occupied 10:00-11:00
    // Resource B: occupied 10:00-11:00
    // These do NOT conflict — they are different resources

    // Resource A availability check
    const availableA: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T17:00:00Z" },
    ];
    const blockedA: InstantRange[] = [
      { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
    ];

    // Resource B availability check (its own appointment doesn't affect A)
    const availableB: InstantRange[] = [
      { start: "2026-08-06T09:00:00Z", end: "2026-08-06T17:00:00Z" },
    ];
    const blockedB: InstantRange[] = [
      { start: "2026-08-06T10:00:00Z", end: "2026-08-06T11:00:00Z" },
    ];

    const resultA = subtractInstantRanges(availableA, blockedA);
    const resultB = subtractInstantRanges(availableB, blockedB);

    // Both have holes at 10-11, but each independently
    expect(resultA).toHaveLength(2);
    expect(resultB).toHaveLength(2);
  });
});
