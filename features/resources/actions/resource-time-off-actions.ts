"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { resourceTimeOffSchema } from "../schemas/resource-time-off-schema";
import type { ResourceScheduleActionResult } from "./set-resource-working-hours";

/**
 * Creates a time-off entry for a resource.
 */
export async function createResourceTimeOffAction(
  tenantSlug: string,
  values: Record<string, unknown>
): Promise<ResourceScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active")
    return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Verify owner/admin
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role))
    return { success: false, message: "Only owners and admins can manage time off." };

  // Validate
  let validated: {
    resourceId: string;
    locationId?: string | null;
    title?: string | null;
    notes?: string | null;
    isAllDay: boolean;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
  };
  try {
    validated = await resourceTimeOffSchema.validate(values, { abortEarly: false, stripUnknown: true });
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
    return { success: false, message: "Invalid time-off data." };
  }

  // Verify resource belongs to tenant
  const { data: res } = await supabase
    .from("resources")
    .select("id")
    .eq("id", validated.resourceId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!res) return { success: false, message: "Resource not found." };

  // Convert dates/times to timestamptz
  // For full-day: use start of startDate and start of day after endDate (exclusive end)
  // For time-specific: combine date + time
  let startsAt: string;
  let endsAt: string;

  if (validated.isAllDay) {
    // Full day: midnight to midnight+1day in tenant local time
    // Store as ISO strings — the database handles timestamptz
    startsAt = `${validated.startDate}T00:00:00`;
    // End date is inclusive for UI, so exclusive end is next day
    const endDateObj = new Date(validated.endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const nextDay = endDateObj.toISOString().split("T")[0];
    endsAt = `${nextDay}T00:00:00`;
  } else {
    startsAt = `${validated.startDate}T${validated.startTime}:00`;
    endsAt = `${validated.endDate}T${validated.endTime}:00`;
  }

  // Call RPC
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("create_resource_time_off", {
    p_tenant_id: tenant.id,
    p_resource_id: validated.resourceId,
    p_location_id: validated.locationId ?? null,
    p_title: validated.title ?? null,
    p_notes: validated.notes ?? null,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_is_all_day: validated.isAllDay,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("overlaps") || rpcError.message?.includes("overlap")) {
      return { success: false, message: "This time-off period overlaps with an existing entry." };
    }
    if (rpcError.message?.includes("Start time must be before")) {
      return { success: false, message: "End time must be after start time." };
    }
    console.error("[create-resource-time-off]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to create time off." };
  }

  revalidatePath(`/${tenantSlug}/resources/${validated.resourceId}/edit`);
  revalidatePath(`/${tenantSlug}/resources`);
  return { success: true, message: "Time off created." };
}

/**
 * Updates a time-off entry.
 */
export async function updateResourceTimeOffAction(
  tenantSlug: string,
  timeOffId: string,
  values: Record<string, unknown>
): Promise<ResourceScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active")
    return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Verify owner/admin
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role))
    return { success: false, message: "Only owners and admins can manage time off." };

  // Validate
  let validated: {
    resourceId: string;
    locationId?: string | null;
    title?: string | null;
    notes?: string | null;
    isAllDay: boolean;
    startDate: string;
    endDate: string;
    startTime?: string | null;
    endTime?: string | null;
  };
  try {
    validated = await resourceTimeOffSchema.validate(values, { abortEarly: false, stripUnknown: true });
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
    return { success: false, message: "Invalid time-off data." };
  }

  // Convert dates/times
  let startsAt: string;
  let endsAt: string;

  if (validated.isAllDay) {
    startsAt = `${validated.startDate}T00:00:00`;
    const endDateObj = new Date(validated.endDate);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const nextDay = endDateObj.toISOString().split("T")[0];
    endsAt = `${nextDay}T00:00:00`;
  } else {
    startsAt = `${validated.startDate}T${validated.startTime}:00`;
    endsAt = `${validated.endDate}T${validated.endTime}:00`;
  }

  // Call RPC
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("update_resource_time_off", {
    p_tenant_id: tenant.id,
    p_time_off_id: timeOffId,
    p_location_id: validated.locationId ?? null,
    p_title: validated.title ?? null,
    p_notes: validated.notes ?? null,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_is_all_day: validated.isAllDay,
    p_is_active: true,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("overlaps") || rpcError.message?.includes("overlap")) {
      return { success: false, message: "This time-off period overlaps with an existing entry." };
    }
    if (rpcError.message?.includes("not found")) {
      return { success: false, message: "Time-off entry not found." };
    }
    console.error("[update-resource-time-off]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to update time off." };
  }

  revalidatePath(`/${tenantSlug}/resources/${validated.resourceId}/edit`);
  revalidatePath(`/${tenantSlug}/resources`);
  return { success: true, message: "Time off updated." };
}

/**
 * Deletes a time-off entry.
 */
export async function deleteResourceTimeOffAction(
  tenantSlug: string,
  timeOffId: string
): Promise<ResourceScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active")
    return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Verify owner/admin
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role))
    return { success: false, message: "Only owners and admins can manage time off." };

  // Call RPC
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("delete_resource_time_off", {
    p_tenant_id: tenant.id,
    p_time_off_id: timeOffId,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("not found")) {
      return { success: false, message: "Time-off entry not found." };
    }
    console.error("[delete-resource-time-off]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to delete time off." };
  }

  revalidatePath(`/${tenantSlug}/resources`);
  return { success: true, message: "Time off deleted." };
}
