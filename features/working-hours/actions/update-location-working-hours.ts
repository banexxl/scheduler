"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { locationWorkingHoursSchema } from "../schemas/location-working-hours-schema";

export type WorkingHoursActionResult = {
  success: boolean;
  message?: string;
};

/**
 * Updates working hours for a location via the replace_location_working_hours RPC.
 * Requires owner or admin role.
 */
export async function updateLocationWorkingHoursAction(
  tenantSlug: string,
  locationId: string,
  values: { days: Array<{ dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null }> }
): Promise<WorkingHoursActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();

  // Verify location belongs to tenant
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!location) {
    return { success: false, message: "Location not found." };
  }

  // Validate
  try {
    await locationWorkingHoursSchema.validate(values, { abortEarly: false });
  } catch {
    return { success: false, message: "Invalid working hours data." };
  }

  // Normalize for RPC
  const hours = values.days.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    isClosed: d.isClosed,
    opensAt: d.isClosed ? null : d.opensAt,
    closesAt: d.isClosed ? null : d.closesAt,
  }));

  const { error } = await supabase.rpc("replace_location_working_hours", {
    target_location_id: locationId,
    hours: JSON.parse(JSON.stringify(hours)),
  });

  if (error) {
    console.error("[working-hours] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) {
      return { success: false, message: "Only owners and admins can update working hours." };
    }
    if (error.message?.includes("before")) {
      return { success: false, message: "Opening time must be before closing time." };
    }
    return { success: false, message: "Unable to save working hours. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations/${locationId}/working-hours`);
  revalidatePath(`/${tenantSlug}/locations`);

  return { success: true, message: "Working hours saved successfully." };
}
