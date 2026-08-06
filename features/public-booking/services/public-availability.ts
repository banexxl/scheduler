import "server-only";

/**
 * Public availability endpoint — Milestone 6.11.
 *
 * Provides sanitized availability for public booking.
 * Uses the existing calculateAvailability engine and strips internal details.
 *
 * Does NOT expose:
 * - Occupied windows / buffers
 * - Internal reason codes
 * - Time-off records
 * - Appointment details
 * - Schedule source metadata
 * - Internal resource details
 */

import { calculateAvailability } from "@/features/availability/services/calculate-availability";
import { resolvePublicBookingContext } from "./public-tenant-resolver";
import type {
  PublicAvailabilityResult,
  PublicAvailabilityOption,
  PublicBookingSettings,
} from "../types/public-booking";

// ─── Input ───────────────────────────────────────────────────────────────────

export type PublicAvailabilityInput = {
  tenantSlug: string;
  serviceId: string;
  locationId: string;
  resourceId?: string | null;
  localDate: string;
};

// ─── Result ──────────────────────────────────────────────────────────────────

type AvailabilitySuccess = { success: true; data: PublicAvailabilityResult };
type AvailabilityError = { success: false; error: string; code?: string };
type PublicAvailabilityResponse = AvailabilitySuccess | AvailabilityError;

// ─── Main Function ───────────────────────────────────────────────────────────

export async function getPublicAvailability(
  input: PublicAvailabilityInput
): Promise<PublicAvailabilityResponse> {
  const { tenantSlug, serviceId, locationId, resourceId, localDate } = input;

  // 1. Resolve tenant and verify booking enabled
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) {
    return { success: false, error: "Booking is not available.", code: "BOOKING_DISABLED" };
  }

  const { tenant, settings } = context;

  // 2. Calculate availability using the shared engine
  const result = await calculateAvailability(
    {
      tenantId: tenant.id,
      serviceId,
      locationId,
      resourceId: resourceId ?? undefined,
      localDate,
    },
    new Date()
  );

  // 3. Sanitize the output — strip internal details
  const options = sanitizeAvailabilityOptions(result, settings);

  return {
    success: true,
    data: {
      localDate: result.localDate,
      timeZone: result.timeZone,
      options,
    },
  };
}

// ─── Sanitization ────────────────────────────────────────────────────────────

import type { AvailabilityResult } from "@/features/availability/types/availability";

/**
 * Converts internal availability result to public-safe options.
 * Groups slots by start time and merges resource options.
 */
function sanitizeAvailabilityOptions(
  result: AvailabilityResult,
  settings: PublicBookingSettings
): PublicAvailabilityOption[] {
  // Group all slots by startsAt across resources
  const slotMap = new Map<string, PublicAvailabilityOption>();

  for (const resource of result.resources) {
    for (const slot of resource.slots) {
      const key = slot.startsAt;
      const existing = slotMap.get(key);

      const resourceOption = {
        resourceId: slot.resourceId,
        resourceName: settings.showResourceNames ? resource.resourceName : undefined,
        durationMinutes: slot.durationMinutes,
        price: settings.showServicePrices ? slot.price : "0",
        currency: slot.currency,
      };

      if (existing) {
        existing.resourceOptions.push(resourceOption);
      } else {
        slotMap.set(key, {
          startsAt: slot.startsAt,
          localStartTime: slot.localStartTime,
          localEndTime: slot.localEndTime,
          resourceOptions: [resourceOption],
        });
      }
    }
  }

  // Sort by start time
  const options = [...slotMap.values()].sort(
    (a, b) => a.startsAt.localeCompare(b.startsAt)
  );

  return options;
}
