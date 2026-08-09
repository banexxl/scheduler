/**
 * Staff Schedule Types — Milestone 12.3.
 */

export type StaffScheduleDTO = {
  staffId: string;
  resourceId: string;
  displayName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  isActive: boolean;
  todayAppointmentCount: number;
  upcomingTimeOff: Array<{ startsAt: string; endsAt: string }>;
};

export type ScheduleConflictResult = {
  conflictCount: number;
  preview: Array<{
    appointmentNumber: string;
    startsAt: string;
    customerName: string;
    serviceName: string;
  }>;
};

export type MyScheduleDTO = {
  staffId: string;
  resourceId: string;
  displayName: string;
  todayAppointmentCount: number;
  upcomingTimeOff: Array<{ startsAt: string; endsAt: string }>;
};
