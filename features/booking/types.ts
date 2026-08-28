/**
 * Booking Flow Types — Milestones 17.0 + 17.1.
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
  /** ISO 8601 instant — customer-visible start */
  startsAt: string;
  /** ISO 8601 instant — customer-visible end */
  endsAt: string;
  /** "HH:mm" in tenant timezone */
  localStartTime: string;
  /** "HH:mm" in tenant timezone */
  localEndTime: string;
  /** Resource that will perform the service */
  resourceId: string;
  /** Duration in minutes */
  durationMinutes: number;
};

// ─── Booking State ───────────────────────────────────────────────────────────

export type BookingState = {
  services: SelectedService[];
  staffId: string | null;
  locationId: string | null;
  /** Selected date in "YYYY-MM-DD" (tenant-local) */
  date: string | null;
  /** Selected time slot */
  slot: BookingTimeSlot | null;
  /** Future milestone */
  customer: null;
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
