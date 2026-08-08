/**
 * Customer Favorites Types — Milestone 9.3.
 */

export type CustomerFavoriteBusiness = {
  tenantSlug: string;
  name: string;
  logoUrl: string | null;
  city: string | null;
  nextAppointmentAt: string | null;
};

export type CustomerFavoriteService = {
  tenantSlug: string;
  serviceSlug: string;
  serviceName: string;
  businessName: string;
  durationMinutes: number;
  price: string | null;
  currency: string | null;
};

export type CustomerFavoriteResource = {
  tenantSlug: string;
  resourceName: string;
  businessName: string;
};

export type RecentBookingShortcut = {
  tenantSlug: string;
  businessName: string;
  serviceName: string;
  serviceSlug: string;
  locationName: string;
  lastBookedAt: string;
};
