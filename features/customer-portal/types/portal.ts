/**
 * Customer Portal Types — Milestone 8.6.
 *
 * Public-safe DTOs for customer portal display.
 * No raw appointment IDs exposed.
 */

export type CustomerPortalAppointment = {
  appointmentNumber: string;
  status: string;
  serviceName: string;
  locationName: string;
  resourceName: string | null;
  startsAt: string;
  endsAt: string;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
  durationMinutes: number;
  price: string;
  currency: string;
  canCancel: boolean;
  canReschedule: boolean;
};

export type CustomerPortalData = {
  upcoming: CustomerPortalAppointment[];
  past: CustomerPortalAppointment[];
  cancelled: CustomerPortalAppointment[];
};
