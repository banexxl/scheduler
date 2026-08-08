/**
 * Unified Customer Dashboard Types — Milestone 9.2.
 */

// ─── Unified Appointment ─────────────────────────────────────────────────────

export type CustomerUnifiedAppointment = {
  tenantSlug: string;
  tenantName: string;
  tenantLogoUrl: string | null;

  appointmentNumber: string;
  status: string;

  serviceName: string;
  resourceName: string | null;
  locationName: string;

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
  canBookAgain: boolean;
};

// ─── Unified Rewards ─────────────────────────────────────────────────────────

export type CustomerBusinessRewards = {
  tenantSlug: string;
  tenantName: string;
  loyaltyPoints: number | null;
  loyaltyVisits: number | null;
  packageCredits: number | null;
  packageName: string | null;
};

// ─── Customer Dashboard Summary ──────────────────────────────────────────────

export type CustomerDashboardSummary = {
  upcomingCount: number;
  linkedBusinessCount: number;
  nextAppointment: CustomerUnifiedAppointment | null;
  rewards: CustomerBusinessRewards[];
};
