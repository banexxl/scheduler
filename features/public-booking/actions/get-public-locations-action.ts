"use server";

import { resolvePublicBookingContext } from "../services/public-tenant-resolver";
import { getPublicLocationsForService } from "../services/public-service-discovery";
import type { PublicBookableLocation } from "../types/public-booking";

type Result =
  | { success: true; data: PublicBookableLocation[] }
  | { success: false; error: string };

export async function getPublicLocationsAction(
  tenantSlug: string,
  serviceId: string
): Promise<Result> {
  const context = await resolvePublicBookingContext(tenantSlug);
  if (!context) return { success: false, error: "Booking is not available." };

  const locations = await getPublicLocationsForService(context.tenant.id, serviceId);
  return { success: true, data: locations };
}
