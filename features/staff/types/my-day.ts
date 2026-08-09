/**
 * My Day Types — Milestone 12.4.
 */

import type { AppointmentStatus } from "@/features/appointments/types/appointment";

export type MyDayStaff = {
  staffProfileId: string;
  resourceId: string;
  displayName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
};

export type MyDayAppointmentDTO = {
  id: string;
  appointmentNumber: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  operationalState: string;
  serviceName: string;
  locationName: string;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  notesPreview: string | null;
  paymentStatus: string | null;
  canCheckIn: boolean;
  canStart: boolean;
  canComplete: boolean;
  canNoShow: boolean;
  canCancel: boolean;
};

export type MyDayGapDTO = {
  startTime: string;
  endTime: string;
  durationMinutes: number;
};

export type MyDaySummary = {
  total: number;
  upcoming: number;
  checkedIn: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export type MyDayDTO = {
  tenantSlug: string;
  staff: MyDayStaff;
  date: string;
  timezone: string;
  workingHours: Array<{ startTime: string; endTime: string }>;
  timeOff: { active: boolean; startsAt: string | null; endsAt: string | null };
  summary: MyDaySummary;
  nextAppointment: MyDayAppointmentDTO | null;
  appointments: MyDayAppointmentDTO[];
  gaps: MyDayGapDTO[];
};
