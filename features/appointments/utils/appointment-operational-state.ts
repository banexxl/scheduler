import { toZonedTime } from "date-fns-tz";

export type AppointmentOperationalKind = "upcoming" | "starting_soon" | "late" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";

export type AppointmentOperationalState = {
     kind: AppointmentOperationalKind;
     isStartingSoon: boolean;
     isLate: boolean;
     label: string;
};

type AppointmentLike = {
     status: string;
     startsAt: string;
     endsAt: string;
     checkedInAt: string | null;
     serviceStartedAt: string | null;
     completedAt: string | null;
     noShowAt: string | null;
};

const MINUTES_BEFORE_START = 15;

export function getAppointmentOperationalState(
     appointment: AppointmentLike,
     now: Date,
     timeZone: string
): AppointmentOperationalState {
     const startInstant = new Date(appointment.startsAt);
     const endInstant = new Date(appointment.endsAt);
     const checkedInAt = appointment.checkedInAt ? new Date(appointment.checkedInAt) : null;
     const serviceStartedAt = appointment.serviceStartedAt ? new Date(appointment.serviceStartedAt) : null;
     const completedAt = appointment.completedAt ? new Date(appointment.completedAt) : null;
     const noShowAt = appointment.noShowAt ? new Date(appointment.noShowAt) : null;

     if (appointment.status === "cancelled") {
          return { kind: "cancelled", isStartingSoon: false, isLate: false, label: "Cancelled" };
     }

     if (appointment.status === "completed" || completedAt) {
          return { kind: "completed", isStartingSoon: false, isLate: false, label: "Completed" };
     }

     if (appointment.status === "no_show" || noShowAt) {
          return { kind: "no_show", isStartingSoon: false, isLate: false, label: "No show" };
     }

     const nowInTimeZone = toZonedTime(now, timeZone);
     const startInTimeZone = toZonedTime(startInstant, timeZone);
     const endInTimeZone = toZonedTime(endInstant, timeZone);
     const minutesUntilStart = (startInTimeZone.getTime() - nowInTimeZone.getTime()) / 60_000;
     const minutesElapsed = (nowInTimeZone.getTime() - startInTimeZone.getTime()) / 60_000;

     if (appointment.status === "in_progress" || serviceStartedAt || (checkedInAt && nowInTimeZone.getTime() >= startInTimeZone.getTime())) {
          return {
               kind: "in_progress",
               isStartingSoon: false,
               isLate: false,
               label: "In progress",
          };
     }

     if (appointment.status === "checked_in" || checkedInAt) {
          return {
               kind: "checked_in",
               isStartingSoon: false,
               isLate: false,
               label: "Checked in",
          };
     }

     if (minutesUntilStart > 0 && minutesUntilStart <= MINUTES_BEFORE_START) {
          return {
               kind: "starting_soon",
               isStartingSoon: true,
               isLate: false,
               label: "Starting soon",
          };
     }

     if (minutesElapsed > 0 && nowInTimeZone.getTime() < endInTimeZone.getTime()) {
          return {
               kind: "late",
               isStartingSoon: false,
               isLate: true,
               label: "Late",
          };
     }

     return {
          kind: "upcoming",
          isStartingSoon: false,
          isLate: false,
          label: "Upcoming",
     };
}
