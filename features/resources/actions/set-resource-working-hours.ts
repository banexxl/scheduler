"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { setResourceWorkingHoursSchema } from "../schemas/resource-working-hour-schema";
import type { ResourceWorkingHourInput } from "../types/resource-working-hour";

export type ResourceScheduleActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Atomically sets the weekly working schedule for a resource using the database RPC.
 * Accepts an empty periods array to clear the schedule.
 */
export async function setResourceWorkingHoursAction(
  tenantSlug: string,
  resourceId: string,
  periods: ResourceWorkingHourInput[]
): Promise<ResourceScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active")
    return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Verify owner/admin membership
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role))
    return { success: false, message: "Only owners and admins can manage resource schedules." };

  // Validate input
  try {
    await setResourceWorkingHoursSchema.validate(
      { resourceId, periods },
      { abortEarly: false, stripUnknown: true }
    );
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => {
        if (e.path) fieldErrors[e.path] = e.message;
      });
      return { success: false, fieldErrors };
    }
    if (error && typeof error === "object" && "message" in error) {
      return { success: false, message: (error as { message: string }).message };
    }
    return { success: false, message: "Invalid schedule data." };
  }

  // Verify resource belongs to tenant
  const { data: res } = await supabase
    .from("resources")
    .select("id")
    .eq("id", resourceId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!res) return { success: false, message: "Resource not found." };

  // Convert periods to JSONB payload
  const jsonbPayload = periods.map((p, idx) => ({
    location_id: p.locationId ?? null,
    day_of_week: p.dayOfWeek,
    start_time: p.startTime,
    end_time: p.endTime,
    is_active: p.isActive,
    sort_order: p.sortOrder ?? idx,
  }));

  // Call the atomic RPC
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("set_resource_working_hours", {
    p_tenant_id: tenant.id,
    p_resource_id: resourceId,
    p_periods: jsonbPayload,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("overlaps") || rpcError.message?.includes("overlapping")) {
      return { success: false, message: "Schedule contains overlapping periods. Please adjust times." };
    }
    if (rpcError.message?.includes("Location does not belong")) {
      return { success: false, message: "One or more locations do not belong to this business." };
    }
    if (rpcError.message?.includes("start_time must be before")) {
      return { success: false, message: "Start time must be before end time. Overnight periods are not supported." };
    }
    if (rpcError.message?.includes("Resource not found")) {
      return { success: false, message: "Resource not found in this business." };
    }
    console.error("[set-resource-working-hours]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to save working hours." };
  }

  revalidatePath(`/${tenantSlug}/resources/${resourceId}/edit`);
  revalidatePath(`/${tenantSlug}/resources`);
  return { success: true, message: "Working hours saved." };
}
