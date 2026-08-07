export type AppointmentTimelineEntry = {
     label: string;
     timestamp: string | null;
     kind: "created" | "status" | "operational";
};

export type AppointmentStatusHistoryEntry = {
     fromStatus: string;
     toStatus: string;
     changedAt: string;
};

type AppointmentTimelineInput = {
     createdAt: string;
     updatedAt: string;
     status: string;
     checkedInAt: string | null;
     serviceStartedAt: string | null;
     completedAt: string | null;
     cancelledAt: string | null;
     cancellationReason: string | null;
};

export function buildAppointmentTimeline(
     appointment: AppointmentTimelineInput,
     history: AppointmentStatusHistoryEntry[] = []
): AppointmentTimelineEntry[] {
     const timeline: AppointmentTimelineEntry[] = [
          { label: "Created", timestamp: appointment.createdAt, kind: "created" },
     ];

     // Track which statuses are already represented by history entries
     const historyStatuses = new Set<string>();

     for (const item of history) {
          const label = getStatusLabel(item.toStatus);
          timeline.push({ label, timestamp: item.changedAt, kind: "status" });
          historyStatuses.add(item.toStatus);
     }

     // Only add operational timestamps if they aren't already covered by status history
     if (appointment.checkedInAt && !historyStatuses.has("checked_in")) {
          timeline.push({ label: "Checked in", timestamp: appointment.checkedInAt, kind: "operational" });
     }

     if (appointment.serviceStartedAt && !historyStatuses.has("in_progress")) {
          timeline.push({ label: "Started service", timestamp: appointment.serviceStartedAt, kind: "operational" });
     }

     if (appointment.completedAt && !historyStatuses.has("completed")) {
          timeline.push({ label: "Completed", timestamp: appointment.completedAt, kind: "operational" });
     }

     if (appointment.cancelledAt && !historyStatuses.has("cancelled")) {
          timeline.push({ label: "Cancelled", timestamp: appointment.cancelledAt, kind: "operational" });
     }

     return timeline.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
     });
}

function getStatusLabel(status: string): string {
     switch (status) {
          case "confirmed":
               return "Confirmed";
          case "checked_in":
               return "Checked in";
          case "in_progress":
               return "Started service";
          case "completed":
               return "Completed";
          case "cancelled":
               return "Cancelled";
          case "no_show":
               return "Marked no-show";
          default:
               return status;
     }
}
