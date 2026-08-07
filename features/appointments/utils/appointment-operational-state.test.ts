import { describe, expect, it } from "vitest";
import { getAppointmentOperationalState } from "./appointment-operational-state";

describe("getAppointmentOperationalState", () => {
     it("flags appointments that are about to start", () => {
          const state = getAppointmentOperationalState(
               {
                    status: "confirmed",
                    startsAt: "2026-08-01T09:10:00.000Z",
                    endsAt: "2026-08-01T09:40:00.000Z",
                    checkedInAt: null,
                    serviceStartedAt: null,
                    completedAt: null,
                    noShowAt: null,
               },
               new Date("2026-08-01T09:00:00.000Z"),
               "UTC"
          );

          expect(state.kind).toBe("starting_soon");
          expect(state.isStartingSoon).toBe(true);
          expect(state.isLate).toBe(false);
     });

     it("flags appointments that have already started and are still pending check-in", () => {
          const state = getAppointmentOperationalState(
               {
                    status: "confirmed",
                    startsAt: "2026-08-01T09:00:00.000Z",
                    endsAt: "2026-08-01T09:30:00.000Z",
                    checkedInAt: null,
                    serviceStartedAt: null,
                    completedAt: null,
                    noShowAt: null,
               },
               new Date("2026-08-01T09:20:00.000Z"),
               "UTC"
          );

          expect(state.kind).toBe("late");
          expect(state.isLate).toBe(true);
          expect(state.isStartingSoon).toBe(false);
     });

     it("uses explicit status when the appointment is already in progress", () => {
          const state = getAppointmentOperationalState(
               {
                    status: "in_progress",
                    startsAt: "2026-08-01T09:00:00.000Z",
                    endsAt: "2026-08-01T09:30:00.000Z",
                    checkedInAt: "2026-08-01T09:05:00.000Z",
                    serviceStartedAt: "2026-08-01T09:10:00.000Z",
                    completedAt: null,
                    noShowAt: null,
               },
               new Date("2026-08-01T09:15:00.000Z"),
               "UTC"
          );

          expect(state.kind).toBe("in_progress");
          expect(state.isLate).toBe(false);
     });
});
