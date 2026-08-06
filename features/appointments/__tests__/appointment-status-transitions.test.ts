import { describe, it, expect } from "vitest";
import {
  canTransitionAppointmentStatus,
  STATUS_TRANSITIONS,
  TERMINAL_STATUSES,
  isTerminalStatus,
  isBlockingStatus,
  APPOINTMENT_STATUSES,
} from "../types/appointment";
import type { AppointmentStatus } from "../types/appointment";

// ─── canTransitionAppointmentStatus ──────────────────────────────────────────

describe("canTransitionAppointmentStatus", () => {
  describe("allowed transitions", () => {
    const cases: [AppointmentStatus, AppointmentStatus][] = [
      ["pending", "confirmed"],
      ["pending", "cancelled"],
      ["confirmed", "checked_in"],
      ["confirmed", "in_progress"],
      ["confirmed", "completed"],
      ["confirmed", "cancelled"],
      ["confirmed", "no_show"],
      ["checked_in", "in_progress"],
      ["checked_in", "completed"],
      ["checked_in", "cancelled"],
      ["checked_in", "no_show"],
      ["in_progress", "completed"],
      ["in_progress", "cancelled"],
    ];

    it.each(cases)("%s → %s is allowed", (from, to) => {
      const result = canTransitionAppointmentStatus(from, to);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe("terminal statuses cannot transition", () => {
    const terminalStatuses: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
    const targets: AppointmentStatus[] = ["pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"];

    for (const terminal of terminalStatuses) {
      for (const target of targets) {
        if (terminal === target) continue;
        it(`${terminal} → ${target} is NOT allowed`, () => {
          const result = canTransitionAppointmentStatus(terminal, target);
          expect(result.allowed).toBe(false);
          expect(result.reason).toContain("terminal");
        });
      }
    }
  });

  describe("invalid non-terminal transitions", () => {
    const cases: [AppointmentStatus, AppointmentStatus][] = [
      ["pending", "checked_in"],
      ["pending", "in_progress"],
      ["pending", "completed"],
      ["pending", "no_show"],
      ["in_progress", "pending"],
      ["in_progress", "confirmed"],
      ["in_progress", "checked_in"],
      ["in_progress", "no_show"],
    ];

    it.each(cases)("%s → %s is NOT allowed", (from, to) => {
      const result = canTransitionAppointmentStatus(from, to);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("same-status transition", () => {
    it.each(APPOINTMENT_STATUSES)("%s → %s is NOT allowed (same)", (status) => {
      const result = canTransitionAppointmentStatus(status, status);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("already");
    });
  });
});

// ─── Blocking Status Semantics ───────────────────────────────────────────────

describe("blocking status semantics", () => {
  it("cancelled is the only non-blocking status", () => {
    expect(isBlockingStatus("cancelled")).toBe(false);
  });

  it("all non-cancelled statuses are blocking", () => {
    const nonCancelled = APPOINTMENT_STATUSES.filter((s) => s !== "cancelled");
    for (const status of nonCancelled) {
      expect(isBlockingStatus(status)).toBe(true);
    }
  });
});

// ─── Terminal Status Detection ───────────────────────────────────────────────

describe("isTerminalStatus", () => {
  it("completed is terminal", () => expect(isTerminalStatus("completed")).toBe(true));
  it("cancelled is terminal", () => expect(isTerminalStatus("cancelled")).toBe(true));
  it("no_show is terminal", () => expect(isTerminalStatus("no_show")).toBe(true));
  it("pending is NOT terminal", () => expect(isTerminalStatus("pending")).toBe(false));
  it("confirmed is NOT terminal", () => expect(isTerminalStatus("confirmed")).toBe(false));
  it("checked_in is NOT terminal", () => expect(isTerminalStatus("checked_in")).toBe(false));
  it("in_progress is NOT terminal", () => expect(isTerminalStatus("in_progress")).toBe(false));
});

// ─── STATUS_TRANSITIONS completeness ─────────────────────────────────────────

describe("STATUS_TRANSITIONS map", () => {
  it("has entries for all statuses", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toBeDefined();
      expect(Array.isArray(STATUS_TRANSITIONS[status])).toBe(true);
    }
  });

  it("terminal statuses have empty transition arrays", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(STATUS_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("non-terminal statuses have at least one transition", () => {
    const nonTerminal = APPOINTMENT_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s));
    for (const status of nonTerminal) {
      expect(STATUS_TRANSITIONS[status].length).toBeGreaterThan(0);
    }
  });
});
