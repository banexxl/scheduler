"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { locationScheduleExceptionSchema } from "../schemas/location-schedule-exception-schema";
import type { LocationScheduleActionResult } from "./set-location-business-hours";

/**
 * Creates a schedule exception for a location.
 */
export async function createLocationExceptionAction(
  tenantSlug: string,
  values: Record<string, unknown>
): Promise<LocationScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status))
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
    return { success: false, message: "Only owners and admins can manage exceptions." };

  let validated: {
    locationId: string;
    exceptionDate: string;
    exceptionType: string;
    title?: string | null;
    notes?: string | null;
    isActive?: boolean;
    periods: Array<{ startTime: string; endTime: string; sortOrder?: number }>;
  };
  try {
    validated = await locationScheduleExceptionSchema.validate(values, {
      abortEarly: false, stripUnknown: true,
    });
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
    return { success: false, message: "Invalid exception data." };
  }

  const periodsPayload = validated.periods.map((p, idx) => ({
    start_time: p.startTime,
    end_time: p.endTime,
    sort_order: p.sortOrder ?? idx,
  }));

  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("create_location_exception_v2", {
    p_tenant_id: tenant.id,
    p_location_id: validated.locationId,
    p_exception_date: validated.exceptionDate,
    p_exception_type: validated.exceptionType,
    p_title: validated.title ?? null,
    p_notes: validated.notes ?? null,
    p_is_active: validated.isActive ?? true,
    p_periods: periodsPayload,
  }));

  if (rpcError) {
    if (rpcError.code === "23505" || rpcError.message?.includes("duplicate")) {
      return { success: false, message: "An exception already exists for this date." };
    }
    if (rpcError.message?.includes("overlapping")) {
      return { success: false, message: "Custom periods contain overlapping times." };
    }
    if (rpcError.message?.includes("at least one period")) {
      return { success: false, message: "Custom hours must have at least one period." };
    }
    console.error("[create-location-exception]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to create exception." };
  }

  revalidatePath(`/${tenantSlug}/locations/${validated.locationId}/edit`);
  return { success: true, message: "Exception created." };
}


/**
 * Updates a schedule exception for a location.
 */
export async function updateLocationExceptionAction(
  tenantSlug: string,
  exceptionId: string,
  values: Record<string, unknown>
): Promise<LocationScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status))
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
    return { success: false, message: "Only owners and admins can manage exceptions." };

  let validated: {
    locationId: string;
    exceptionDate: string;
    exceptionType: string;
    title?: string | null;
    notes?: string | null;
    isActive?: boolean;
    periods: Array<{ startTime: string; endTime: string; sortOrder?: number }>;
  };
  try {
    validated = await locationScheduleExceptionSchema.validate(values, {
      abortEarly: false, stripUnknown: true,
    });
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
    return { success: false, message: "Invalid exception data." };
  }

  const periodsPayload = validated.periods.map((p, idx) => ({
    start_time: p.startTime,
    end_time: p.endTime,
    sort_order: p.sortOrder ?? idx,
  }));

  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("update_location_exception_v2", {
    p_tenant_id: tenant.id,
    p_exception_id: exceptionId,
    p_exception_type: validated.exceptionType,
    p_title: validated.title ?? null,
    p_notes: validated.notes ?? null,
    p_is_active: validated.isActive ?? true,
    p_periods: periodsPayload,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("not found")) {
      return { success: false, message: "Exception not found." };
    }
    if (rpcError.message?.includes("overlapping")) {
      return { success: false, message: "Custom periods contain overlapping times." };
    }
    console.error("[update-location-exception]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to update exception." };
  }

  revalidatePath(`/${tenantSlug}/locations/${validated.locationId}/edit`);
  return { success: true, message: "Exception updated." };
}

/**
 * Deletes a schedule exception.
 */
export async function deleteLocationExceptionAction(
  tenantSlug: string,
  exceptionId: string
): Promise<LocationScheduleActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status))
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
    return { success: false, message: "Only owners and admins can manage exceptions." };

  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("delete_location_exception_v2", {
    p_tenant_id: tenant.id,
    p_exception_id: exceptionId,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("not found")) {
      return { success: false, message: "Exception not found." };
    }
    console.error("[delete-location-exception]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to delete exception." };
  }

  revalidatePath(`/${tenantSlug}/locations`);
  return { success: true, message: "Exception deleted." };
}
