/**
 * Customer Favorites Types Tests — Milestone 9.3.
 */

import { describe, it, expect } from "vitest";
import type {
  CustomerFavoriteBusiness,
  CustomerFavoriteService,
  RecentBookingShortcut,
} from "../types/customer-favorites";

describe("customer favorites types", () => {
  it("CustomerFavoriteBusiness has required fields", () => {
    const fav: CustomerFavoriteBusiness = {
      tenantSlug: "barber-house",
      name: "Barber House",
      logoUrl: null,
      city: "Belgrade",
      nextAppointmentAt: "2025-08-20T14:00:00Z",
    };
    expect(fav.tenantSlug).toBe("barber-house");
    expect(fav.city).toBe("Belgrade");
  });

  it("CustomerFavoriteService has required fields", () => {
    const fav: CustomerFavoriteService = {
      tenantSlug: "barber-house",
      serviceSlug: "haircut",
      serviceName: "Haircut",
      businessName: "Barber House",
      durationMinutes: 30,
      price: "15.00",
      currency: "EUR",
    };
    expect(fav.durationMinutes).toBe(30);
  });

  it("RecentBookingShortcut represents a unique service+business combo", () => {
    const shortcut: RecentBookingShortcut = {
      tenantSlug: "spa",
      businessName: "Wellness Spa",
      serviceName: "Deep Tissue Massage",
      serviceSlug: "deep-tissue",
      locationName: "Downtown",
      lastBookedAt: "2025-08-10T09:00:00Z",
    };
    expect(shortcut.serviceSlug).toBe("deep-tissue");
  });
});
