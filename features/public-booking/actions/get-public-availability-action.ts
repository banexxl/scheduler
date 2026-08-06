"use server";

/**
 * Public availability server action — Milestone 6.11.
 *
 * Public endpoint (no authentication required).
 * Validates input, calls the availability service, returns sanitized result.
 */

import { getPublicAvailability } from "../services/public-availability";
import { publicAvailabilityRequestSchema } from "../schemas/public-booking-schemas";
import type { PublicAvailabilityResult } from "../types/public-booking";

type ActionSuccess = { success: true; data: PublicAvailabilityResult };
type ActionError = { success: false; error: string; code?: string };
type PublicAvailabilityActionResult = ActionSuccess | ActionError;

export async function getPublicAvailabilityAction(
  tenantSlug: string,
  input: {
    serviceId: string;
    locationId: string;
    resourceId?: string | null;
    localDate: string;
  }
): Promise<PublicAvailabilityActionResult> {
  try {
    // Validate input
    const validated = await publicAvailabilityRequestSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    // Get availability
    const result = await getPublicAvailability({
      tenantSlug,
      serviceId: validated.serviceId,
      locationId: validated.locationId,
      resourceId: validated.resourceId ?? null,
      localDate: validated.localDate,
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return { success: false, error: "Invalid request.", code: "VALIDATION_ERROR" };
    }
    return { success: false, error: "Unable to load availability.", code: "UNKNOWN_ERROR" };
  }
}
