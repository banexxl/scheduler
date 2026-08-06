"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { locationScheduleExceptionSchema } from "../schemas/location-schedule-exception-schema";
import type { ScheduleExceptionActionResult } from "./create-location-schedule-exception";

/**
 * Updates an existing schedule exception.
 * Requires owner or admin role. Rejects editing past exceptions.
 */
export async function updateLocationScheduleExceptionAction(
  tenantSlug: string,
  locationId: string,
  exceptionId: string,
  values: Record<string, unknown>
): Promise<ScheduleExceptionActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
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
    return { success: false, fieldErrors: { exceptionDate: "Cannot set an exception to a past date." } };
  }

  const supabase = await createClient();

  // Check existing exception is not in the past
  const { data: existing } = await supabase
    .from("location_schedule_exceptions")
    .select("exception_date")
    .eq("id", exceptionId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!existing) {
    return { success: false, message: "Exception not found." };
  }

  if (existing.exception_date < today) {
    return { success: false, message: "Cannot edit a past exception." };
  }

  const { error } = await supabase.rpc("update_location_schedule_exception", {
    target_tenant_id: tenant.id,
    target_exception_id: exceptionId,
    p_exception_date: validated.exceptionDate,
    p_name: validated.name.trim(),
    p_is_closed: validated.isClosed,
    p_opens_at: validated.isClosed ? undefined : (validated.opensAt ?? undefined),
    p_closes_at: validated.isClosed ? undefined : (validated.closesAt ?? undefined),
    p_notes: validated.notes ?? undefined,
  });

  if (error) {
    console.error("[update-exception] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) {
      return { success: false, message: "Only owners and admins can update exceptions." };
    }
    if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
      return { success: false, fieldErrors: { exceptionDate: "This location already has a schedule exception for that date." } };
    }
    return { success: false, message: "Unable to update exception. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations/${locationId}/exceptions`);

  return { success: true, message: "Exception updated successfully." };
}
