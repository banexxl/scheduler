import { describe, expect, it } from "vitest";
import { buildAppointmentTimeline } from "./appointment-timeline";

describe("buildAppointmentTimeline", () => {
     it("builds a timeline from appointment timestamps and status history", () => {
          const timeline = buildAppointmentTimeline(
               {
                    createdAt: "2025-01-01T10:00:00.000Z",
                    updatedAt: "2025-01-01T10:30:00.000Z",
                    status: "completed",
                    checkedInAt: "2025-01-01T10:15:00.000Z",
                    serviceStartedAt: "2025-01-01T10:20:00.000Z",
                    completedAt: "2025-01-01T10:30:00.000Z",
                    cancelledAt: null,
                    cancellationReason: null,
               },
               [
                    { fromStatus: "pending", toStatus: "confirmed", changedAt: "2025-01-01T10:05:00.000Z" },
                    { fromStatus: "confirmed", toStatus: "checked_in", changedAt: "2025-01-01T10:15:00.000Z" },
                    { fromStatus: "checked_in", toStatus: "in_progress", changedAt: "2025-01-01T10:20:00.000Z" },
                    { fromStatus: "in_progress", toStatus: "completed", changedAt: "2025-01-01T10:30:00.000Z" },
               ]
          );

          expect(timeline.map((item) => item.label)).toEqual([
               "Created",
               "Confirmed",
               "Checked in",
               "Started service",
               "Completed",
          ]);
     });
});
