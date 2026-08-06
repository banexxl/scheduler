/**
 * Public booking domain types — Milestone 6.11.
 *
 * Types exposed to the public booking flow. These are privacy-safe
 * projections that exclude internal metadata, audit fields, and
 * sensitive configuration.
 */

// ─── Public Tenant ───────────────────────────────────────────────────────────

export type PublicBookingTenant = {
  id: string;
  slug: string;
  name: string;
  defaultTimeZone: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  description?: string | null;
};

// ─── Public Booking Settings ─────────────────────────────────────────────────

export type PublicBookingSettings = {
  isEnabled: boolean;
  allowResourceSelection: boolean;
  allowNoPreference: boolean;
  showServicePrices: boolean;
  showServiceDuration: boolean;
  showResourceNames: boolean;
  bookingPageTitle: string | null;
  bookingPageDescription: string | null;
  confirmationMessage: string | null;
};

export const DEFAULT_PUBLIC_BOOKING_SETTINGS: PublicBookingSettings = {
  isEnabled: false,
  allowResourceSelection: true,
  allowNoPreference: true,
  showServicePrices: true,
  showServiceDuration: true,
  showResourceNames: true,
  bookingPageTitle: null,
  bookingPageDescription: null,
  confirmationMessage: null,
};

// ─── Public Service ──────────────────────────────────────────────────────────

export type PublicBookableService = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  locationCount: number;
};

// ─── Public Category ─────────────────────────────────────────────────────────

export type PublicServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  serviceCount: number;
};

// ─── Public Location ─────────────────────────────────────────────────────────

export type PublicBookableLocation = {
  id: string;
  name: string;
  city: string | null;
  streetAddress: string | null;
  description: string | null;
};

// ─── Public Resource ─────────────────────────────────────────────────────────

export type PublicBookableResource = {
  id: string;
  name: string;
};

// ─── Public Availability ─────────────────────────────────────────────────────

export type PublicAvailabilityOption = {
  startsAt: string;
  localStartTime: string;
  localEndTime: string;
  resourceOptions: Array<{
    resourceId: string;
    resourceName?: string;
    durationMinutes: number;
    price: string;
    currency: string;
  }>;
};

export type PublicAvailabilityResult = {
  localDate: string;
  timeZone: string;
  options: PublicAvailabilityOption[];
  nextAvailableDate?: string | null;
};

// ─── Public Booking Draft ────────────────────────────────────────────────────

export type PublicBookingDraft = {
  serviceId: string | null;
  serviceSlug: string | null;
  locationId: string | null;
  resourcePreference: "specific" | "any";
  resourceId: string | null;
  localDate: string | null;
  startsAt: string | null;
  selectedResourceId: string | null;

  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
};

// ─── Public Error Codes ──────────────────────────────────────────────────────

export type PublicBookingErrorCode =
  | "BOOKING_UNAVAILABLE"
  | "INVALID_SELECTION"
  | "SLOT_TAKEN"
  | "DETAILS_CHANGED"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "CAPTCHA_FAILED"
  | "BOOKING_DISABLED"
  | "UNKNOWN_ERROR";

// ─── Public Confirmation ─────────────────────────────────────────────────────

export type PublicBookingConfirmation = {
  appointmentNumber: string;
  tenantName: string;
  serviceName: string;
  locationName: string;
  resourceName: string | null;
  localDate: string;
  localStartTime: string;
  localEndTime: string;
  timeZone: string;
  durationMinutes: number;
  price: string;
  currency: string;
  customerName: string;
  confirmationMessage: string | null;
};
