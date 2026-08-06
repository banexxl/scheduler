"use server";

/**
 * Server action for the management availability preview.
 *
 * This is a read-only action that:
 * - Authenticates the user
 * - Verifies tenant membership
 * - Validates input
 * - Calls the availability calculation engine
 * - Returns typed serializable output
 *
 * It does NOT:
 * - Perform mutations
 * - Reserve slots
 * - Use service-role access
 * - Expose raw errors
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { availabilityRequestSchema } from "../schemas/availability-request-schema";
import { calculateAvailability } from "../services/calculate-availability";
import type { AvailabilityResult } from "../types/availability";

// ─── Action Types ────────────────────────────────────────────────────────────

type ActionSuccess = {
  success: true;
  data: AvailabilityResult;
};

type ActionError = {
  success: false;
  error: string;
};

type GetAvailabilityPreviewResult = ActionSuccess | ActionError;

// ─── Action ──────────────────────────────────────────────────────────────────

export async function getAvailabilityPreview(
  tenantSlug: string,
  input: {
    serviceId: string;
    locationId: string;
    resourceId?: string | null;
    localDate: string;
    slotIntervalMinutes?: number;
  }
): Promise<GetAvailabilityPreviewResult> {
  try {
    // 1. Authenticate and verify tenant membership
    const { tenant } = await requireTenantMember(tenantSlug);

    // 2. Validate input
    const validated = await availabilityRequestSchema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
    });

    // 3. Calculate availability
    const result = await calculateAvailability({
      tenantId: tenant.id,
      serviceId: validated.serviceId,
      locationId: validated.locationId,
      resourceId: validated.resourceId ?? null,
      localDate: validated.localDate,
      slotIntervalMinutes: validated.slotIntervalMinutes,
    });

    return { success: true, data: result };
  } catch (error) {
    // Do not expose raw error details
    if (error instanceof Error && error.name === "ValidationError") {
      return { success: false, error: (error as { errors?: string[] }).errors?.join(", ") ?? "Validation failed" };
    }
    // Generic error for unexpected failures
    console.error("[availability-preview] Error:", {
      tenantSlug,
      serviceId: input.serviceId,
      locationId: input.locationId,
      localDate: input.localDate,
    });
    return { success: false, error: "Failed to calculate availability" };
  }
}
