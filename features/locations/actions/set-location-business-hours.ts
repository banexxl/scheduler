"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { setLocationBusinessHoursSchema } from "../schemas/location-business-hour-schema";
import type { LocationBusinessHourInput } from "../types/location-business-hour";

export type LocationScheduleActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Atomically sets the weekly business hours for a location.
 */
export async function setLocationBusinessHoursAction(
  tenantSlug: string,
  locationId: string,
  periods: LocationBusinessHourInput[]
): Promise<LocationScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active")
    return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role))
    return { success: false, message: "Only owners and admins can manage business hours." };

  // Validate
  try {
    await setLocationBusinessHoursSchema.validate(
      { locationId, periods },
      { abortEarly: false, stripUnknown: true }
    );
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      return { success: false, message: (error as { message: string }).message };
    }
    return { success: false, message: "Invalid schedule data." };
  }

  // Convert to JSONB payload
  const jsonbPayload = periods.map((p, idx) => ({
    day_of_week: p.dayOfWeek,
    start_time: p.startTime,
    end_time: p.endTime,
    is_active: p.isActive,
    sort_order: p.sortOrder ?? idx,
  }));

  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("set_location_business_hours", {
    p_tenant_id: tenant.id,
    p_location_id: locationId,
    p_periods: jsonbPayload,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("overlaps") || rpcError.message?.includes("overlapping")) {
      return { success: false, message: "Schedule contains overlapping periods." };
    }
    if (rpcError.message?.includes("start_time must be before")) {
      return { success: false, message: "Start time must be before end time." };
    }
    if (rpcError.message?.includes("Location not found")) {
      return { success: false, message: "Location not found." };
    }
    console.error("[set-location-business-hours]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to save business hours." };
  }

  revalidatePath(`/${tenantSlug}/locations/${locationId}/edit`);
  revalidatePath(`/${tenantSlug}/locations`);
  return { success: true, message: "Business hours saved." };
}
