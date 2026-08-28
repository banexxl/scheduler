/**
 * Booking Flow Types — Milestones 17.0, 17.1, 17.2.
 *
 * Shared state model for the multi-page booking flow.
 * Session-only — no localStorage, no URL params.
 */

// ─── Selected Service ────────────────────────────────────────────────────────

export type SelectedService = {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  price: string;
  currency: string;
  categoryId: string | null;
  categoryName: string | null;
};

// ─── Eligible Staff ──────────────────────────────────────────────────────────

export type EligibleStaffMember = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  resourceId: string;
};

// ─── Booking Location ────────────────────────────────────────────────────────

export type BookingLocation = {
  id: string;
  name: string;
  city: string | null;
  streetAddress: string | null;
  phoneNumber: string | null;
};

// ─── Time Slot (Milestone 17.1) ──────────────────────────────────────────────

export type BookingTimeSlot = {
  startsAt: string;
  endsAt: string;
  localStartTime: string;
  localEndTime: string;
  resourceId: string;
  durationMinutes: number;
};

// ─── Customer Info (Milestone 17.2) ──────────────────────────────────────────

export type CustomerInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

// ─── Booking Confirmation ────────────────────────────────────────────────────

export type BookingConfirmation = {
  appointmentNumber: string;
  tenantName: string;
  serviceName: string;
  locationName: string;
  resourceName: string | null;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
  durationMinutes: number;
  price: string;
  currency: string;
  customerName: string;
};

// ─── Booking State ───────────────────────────────────────────────────────────

export type BookingState = {
  services: SelectedService[];
  staffId: string | null;
  locationId: string | null;
  date: string | null;
  slot: BookingTimeSlot | null;
  customer: CustomerInfo | null;
  notes: string;
};

export const INITIAL_BOOKING_STATE: BookingState = {
  services: [],
  staffId: null,
  locationId: null,
  date: null,
  slot: null,
  customer: null,
  notes: "",
};

// ─── Actions ─────────────────────────────────────────────────────────────────

export type BookingAction =
  | { type: "ADD_SERVICE"; service: SelectedService }
  | { type: "REMOVE_SERVICE"; serviceId: string }
  | { type: "SET_SERVICES"; services: SelectedService[] }
  | { type: "SET_STAFF"; staffId: string | null }
  | { type: "SET_LOCATION"; locationId: string | null }
  | { type: "SET_DATE"; date: string | null }
  | { type: "SET_SLOT"; slot: BookingTimeSlot | null }
  | { type: "SET_CUSTOMER"; customer: CustomerInfo }
  | { type: "RESET" };

// ─── Stepper ─────────────────────────────────────────────────────────────────

export const BOOKING_STEPS = [
  { key: "services", label: "Services" },
  { key: "staff", label: "Staff" },
  { key: "location", label: "Location" },
  { key: "datetime", label: "Date & Time" },
  { key: "details", label: "Details" },
  { key: "confirm", label: "Confirm" },
] as const;

export type BookingStepKey = (typeof BOOKING_STEPS)[number]["key"];

// ─── Computed Values ─────────────────────────────────────────────────────────

export function computeTotalDuration(services: SelectedService[]): number {
  return services.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function computeTotalPrice(services: SelectedService[]): {
  total: number;
  currency: string;
} {
  if (services.length === 0) return { total: 0, currency: "USD" };
  const total = services.reduce((sum, s) => sum + parseFloat(s.price), 0);
  const currency = services[0]?.currency ?? "USD";
  return { total, currency };
}
