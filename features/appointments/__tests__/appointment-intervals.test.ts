import { describe, it, expect } from "vitest";

/**
 * Tests for appointment interval consistency logic — Milestone 6.9.
 *
 * These tests verify the pure interval math that the database trigger also enforces.
 * They use the same invariants:
 * - ends_at - starts_at = duration_minutes
 * - starts_at - occupied_starts_at = buffer_before_minutes
 * - occupied_ends_at - ends_at = buffer_after_minutes
 * - occupied_starts_at < occupied_ends_at
 * - starts_at < ends_at
 * - occupied_starts_at <= starts_at
 * - occupied_ends_at >= ends_at
 */

// ─── Pure Interval Validation Helper ─────────────────────────────────────────

type AppointmentWindow = {
  startsAt: string;
  endsAt: string;
  occupiedStartsAt: string;
  occupiedEndsAt: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

function validateIntervalConsistency(window: AppointmentWindow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const startsMs = new Date(window.startsAt).getTime();
  const endsMs = new Date(window.endsAt).getTime();
  const occStartMs = new Date(window.occupiedStartsAt).getTime();
  const occEndMs = new Date(window.occupiedEndsAt).getTime();

  // Time ordering
  if (startsMs >= endsMs) errors.push("starts_at must be before ends_at");
  if (occStartMs > startsMs) errors.push("occupied_starts_at must be <= starts_at");
  if (occEndMs < endsMs) errors.push("occupied_ends_at must be >= ends_at");
  if (occStartMs >= occEndMs) errors.push("occupied_starts_at must be before occupied_ends_at");

  // Duration match
  const actualDuration = (endsMs - startsMs) / 60_000;
  if (actualDuration !== window.durationMinutes) {
    errors.push(`duration_minutes (${window.durationMinutes}) != ends_at - starts_at (${actualDuration})`);
  }

  // Buffer before match
  const actualBufferBefore = (startsMs - occStartMs) / 60_000;
  if (actualBufferBefore !== window.bufferBeforeMinutes) {
    errors.push(`buffer_before (${window.bufferBeforeMinutes}) != starts_at - occupied_starts_at (${actualBufferBefore})`);
  }

  // Buffer after match
  const actualBufferAfter = (occEndMs - endsMs) / 60_000;
  if (actualBufferAfter !== window.bufferAfterMinutes) {
    errors.push(`buffer_after (${window.bufferAfterMinutes}) != occupied_ends_at - ends_at (${actualBufferAfter})`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("appointment interval consistency", () => {
  it("valid: 30 min duration, 10 min buffer before, 5 min buffer after", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T10:00:00Z",
      endsAt: "2026-08-06T10:30:00Z",
      occupiedStartsAt: "2026-08-06T09:50:00Z",
      occupiedEndsAt: "2026-08-06T10:35:00Z",
      durationMinutes: 30,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 5,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("valid: 60 min duration, no buffers", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T14:00:00Z",
      endsAt: "2026-08-06T15:00:00Z",
      occupiedStartsAt: "2026-08-06T14:00:00Z",
      occupiedEndsAt: "2026-08-06T15:00:00Z",
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    });
    expect(result.valid).toBe(true);
  });

  it("valid: 5 min minimum duration", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T09:00:00Z",
      endsAt: "2026-08-06T09:05:00Z",
      occupiedStartsAt: "2026-08-06T09:00:00Z",
      occupiedEndsAt: "2026-08-06T09:05:00Z",
      durationMinutes: 5,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    });
    expect(result.valid).toBe(true);
  });

  it("invalid: duration does not match timestamps", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T10:00:00Z",
      endsAt: "2026-08-06T10:30:00Z",
      occupiedStartsAt: "2026-08-06T10:00:00Z",
      occupiedEndsAt: "2026-08-06T10:30:00Z",
      durationMinutes: 45, // Wrong: should be 30
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("duration_minutes");
  });

  it("invalid: buffer_before does not match timestamps", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T10:00:00Z",
      endsAt: "2026-08-06T10:30:00Z",
      occupiedStartsAt: "2026-08-06T09:50:00Z",
      occupiedEndsAt: "2026-08-06T10:30:00Z",
      durationMinutes: 30,
      bufferBeforeMinutes: 15, // Wrong: should be 10
      bufferAfterMinutes: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("buffer_before");
  });

  it("invalid: buffer_after does not match timestamps", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T10:00:00Z",
      endsAt: "2026-08-06T10:30:00Z",
      occupiedStartsAt: "2026-08-06T10:00:00Z",
      occupiedEndsAt: "2026-08-06T10:35:00Z",
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 10, // Wrong: should be 5
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("buffer_after");
  });

  it("invalid: starts_at >= ends_at", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T10:30:00Z",
      endsAt: "2026-08-06T10:00:00Z",
      occupiedStartsAt: "2026-08-06T10:30:00Z",
      occupiedEndsAt: "2026-08-06T10:00:00Z",
      durationMinutes: -30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("starts_at must be before ends_at");
  });

  it("invalid: occupied_starts_at > starts_at", () => {
    const result = validateIntervalConsistency({
      startsAt: "2026-08-06T10:00:00Z",
      endsAt: "2026-08-06T10:30:00Z",
      occupiedStartsAt: "2026-08-06T10:05:00Z", // After starts_at!
      occupiedEndsAt: "2026-08-06T10:30:00Z",
      durationMinutes: 30,
      bufferBeforeMinutes: -5,
      bufferAfterMinutes: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("occupied_starts_at must be <= starts_at");
  });
});
