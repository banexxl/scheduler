import { describe, it, expect } from "vitest";
import { subtractInstantRanges, mergeInstantRanges } from "../instant-ranges";

// Helper to create ISO strings for a fixed date
function makeInstant(hour: number, minute: number = 0): string {
  return `2026-06-15T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
}

// ─── mergeInstantRanges ──────────────────────────────────────────────────────

describe("mergeInstantRanges", () => {
  it("returns empty for empty input", () => {
    expect(mergeInstantRanges([])).toEqual([]);
  });

  it("returns single range unchanged", () => {
    const result = mergeInstantRanges([{ start: makeInstant(9), end: makeInstant(17) }]);
    expect(result).toEqual([{ start: makeInstant(9), end: makeInstant(17) }]);
  });

  it("merges overlapping ranges", () => {
    const result = mergeInstantRanges([
      { start: makeInstant(9), end: makeInstant(12) },
      { start: makeInstant(11), end: makeInstant(14) },
    ]);
    expect(result).toEqual([{ start: makeInstant(9), end: makeInstant(14) }]);
  });

  it("merges adjacent ranges", () => {
    const result = mergeInstantRanges([
      { start: makeInstant(9), end: makeInstant(12) },
      { start: makeInstant(12), end: makeInstant(15) },
    ]);
    expect(result).toEqual([{ start: makeInstant(9), end: makeInstant(15) }]);
  });

  it("keeps non-overlapping ranges separate", () => {
    const result = mergeInstantRanges([
      { start: makeInstant(9), end: makeInstant(12) },
      { start: makeInstant(14), end: makeInstant(17) },
    ]);
    expect(result).toEqual([
      { start: makeInstant(9), end: makeInstant(12) },
      { start: makeInstant(14), end: makeInstant(17) },
    ]);
  });

  it("handles unsorted input", () => {
    const result = mergeInstantRanges([
      { start: makeInstant(14), end: makeInstant(17) },
      { start: makeInstant(9), end: makeInstant(12) },
    ]);
    expect(result).toEqual([
      { start: makeInstant(9), end: makeInstant(12) },
      { start: makeInstant(14), end: makeInstant(17) },
    ]);
  });
});

// ─── subtractInstantRanges ───────────────────────────────────────────────────

describe("subtractInstantRanges", () => {
  it("returns empty for empty available", () => {
    expect(subtractInstantRanges([], [{ start: makeInstant(9), end: makeInstant(12) }])).toEqual(
      []
    );
  });

  it("returns available unchanged when no blocks", () => {
    const available = [{ start: makeInstant(9), end: makeInstant(17) }];
    expect(subtractInstantRanges(available, [])).toEqual(available);
  });

  it("returns empty when fully blocked", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(17) }],
      [{ start: makeInstant(8), end: makeInstant(18) }]
    );
    expect(result).toEqual([]);
  });

  it("removes block from start", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(17) }],
      [{ start: makeInstant(9), end: makeInstant(12) }]
    );
    expect(result).toEqual([{ start: makeInstant(12), end: makeInstant(17) }]);
  });

  it("removes block from end", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(17) }],
      [{ start: makeInstant(15), end: makeInstant(17) }]
    );
    expect(result).toEqual([{ start: makeInstant(9), end: makeInstant(15) }]);
  });

  it("splits range with middle block", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(17) }],
      [{ start: makeInstant(12), end: makeInstant(13) }]
    );
    expect(result).toEqual([
      { start: makeInstant(9), end: makeInstant(12) },
      { start: makeInstant(13), end: makeInstant(17) },
    ]);
  });

  it("handles multiple blocks", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(17) }],
      [
        { start: makeInstant(10), end: makeInstant(11) },
        { start: makeInstant(14), end: makeInstant(15) },
      ]
    );
    expect(result).toEqual([
      { start: makeInstant(9), end: makeInstant(10) },
      { start: makeInstant(11), end: makeInstant(14) },
      { start: makeInstant(15), end: makeInstant(17) },
    ]);
  });

  it("handles overlapping blocks (merges them first)", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(17) }],
      [
        { start: makeInstant(11), end: makeInstant(13) },
        { start: makeInstant(12), end: makeInstant(14) },
      ]
    );
    expect(result).toEqual([
      { start: makeInstant(9), end: makeInstant(11) },
      { start: makeInstant(14), end: makeInstant(17) },
    ]);
  });

  it("handles adjacent available and blocked boundaries", () => {
    // Block ends exactly where available starts — no subtraction
    const result = subtractInstantRanges(
      [{ start: makeInstant(12), end: makeInstant(17) }],
      [{ start: makeInstant(9), end: makeInstant(12) }]
    );
    expect(result).toEqual([{ start: makeInstant(12), end: makeInstant(17) }]);
  });

  it("handles block outside available range", () => {
    const result = subtractInstantRanges(
      [{ start: makeInstant(9), end: makeInstant(12) }],
      [{ start: makeInstant(13), end: makeInstant(15) }]
    );
    expect(result).toEqual([{ start: makeInstant(9), end: makeInstant(12) }]);
  });

  it("does not mutate inputs", () => {
    const available = [{ start: makeInstant(9), end: makeInstant(17) }];
    const blocked = [{ start: makeInstant(12), end: makeInstant(13) }];
    const availCopy = JSON.parse(JSON.stringify(available));
    const blockCopy = JSON.parse(JSON.stringify(blocked));
    subtractInstantRanges(available, blocked);
    expect(available).toEqual(availCopy);
    expect(blocked).toEqual(blockCopy);
  });
});
