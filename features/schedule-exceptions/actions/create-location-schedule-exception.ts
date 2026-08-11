"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { locationScheduleExceptionSchema } from "../schemas/location-schedule-exception-schema";

export type ScheduleExceptionActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Creates a new schedule exception for a location.
 * Requires owner or admin role.
 */
export async function createLocationScheduleExceptionAction(
  tenantSlug: string,
  locationId: string,
  values: Record<string, unknown>
): Promise<ScheduleExceptionActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) {
    return { success: false, message: "Business not found." };
  }

  // Validate
  let validated: {
    name: string;
    exceptionDate: string;
    isClosed: boolean;
    opensAt?: string | null;
    closesAt?: string | null;
    notes?: string;
  };

  try {
    validated = await locationScheduleExceptionSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as { inner: Array<{ path?: string; message: string }> };
      const fieldErrors: Record<string, string> = {};
      yupError.inner.forEach((err) => {
        if (err.path) fieldErrors[err.path] = err.message;
      });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  // Reject past dates
  const today = new Date().toISOString().split("T")[0]!;
  if (validated.exceptionDate < today) {
    return { success: false, fieldErrors: { exceptionDate: "Cannot create an exception for a past date." } };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("create_location_schedule_exception", {
    target_tenant_id: tenant.id,
    target_location_id: locationId,
    p_exception_date: validated.exceptionDate,
    p_name: validated.name.trim(),
    p_is_closed: validated.isClosed,
    p_opens_at: validated.isClosed ? undefined : (validated.opensAt ?? undefined),
    p_closes_at: validated.isClosed ? undefined : (validated.closesAt ?? undefined),
    p_notes: validated.notes ?? undefined,
  });

  if (error) {
    console.error("[create-exception] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) {
      return { success: false, message: "Only owners and admins can create exceptions." };
    }
    if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
      return { success: false, fieldErrors: { exceptionDate: "This location already has a schedule exception for that date." } };
    }
    if (error.message?.includes("not found")) {
      return { success: false, message: "Location not found in this business." };
    }
    return { success: false, message: "Unable to create exception. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations/${locationId}/exceptions`);
  redirect(`/${tenantSlug}/locations/${locationId}/exceptions`);
}
