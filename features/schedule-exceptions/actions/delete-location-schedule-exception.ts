"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ScheduleExceptionActionResult } from "./create-location-schedule-exception";

/**
 * Deletes a schedule exception. Requires owner or admin role.
 * Allows deletion of both past and future exceptions.
 */
export async function deleteLocationScheduleExceptionAction(
  tenantSlug: string,
  exceptionId: string
): Promise<ScheduleExceptionActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_location_schedule_exception", {
    target_tenant_id: tenant.id,
    target_exception_id: exceptionId,
  });

  if (error) {
    console.error("[delete-exception] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) {
      return { success: false, message: "Only owners and admins can delete exceptions." };
    }
    if (error.message?.includes("not found")) {
      return { success: false, message: "Exception not found." };
    }
    return { success: false, message: "Unable to delete exception. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations`);

  return { success: true, message: "Exception deleted." };
}
