"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { setServiceResourcesSchema } from "../schemas/service-resource-schema";
import type { ServiceActionResult } from "./create-service";
import type { ServiceResourceAssignmentInput } from "../types/service-resource";

/**
 * Atomically sets the resource assignments for a service using the database RPC.
 * Accepts an empty assignments array to remove all assignments.
 */
export async function setServiceResourcesAction(
  tenantSlug: string,
  values: { serviceId: string; assignments: ServiceResourceAssignmentInput[] }
): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status))
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
    return { success: false, message: "Only owners and admins can manage service resources." };

  // Validate input
  let validated: { serviceId: string; assignments: Array<{
    resourceId: string;
    isActive?: boolean;
    durationOverrideMinutes?: number | null;
    priceOverride?: number | null;
    currencyOverride?: string | null;
    bufferBeforeOverrideMinutes?: number | null;
    bufferAfterOverrideMinutes?: number | null;
    sortOrder?: number;
  }> };
  try {
    validated = await setServiceResourcesSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => {
        if (e.path) fieldErrors[e.path] = e.message;
      });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid input data." };
  }

  // Verify service belongs to tenant
  const { data: svc } = await supabase
    .from("services")
    .select("id")
    .eq("id", validated.serviceId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!svc) return { success: false, message: "Service not found." };

  // Convert assignments to JSONB payload for the RPC
  const jsonbPayload = validated.assignments.map((a, idx) => ({
    resource_id: a.resourceId,
    is_active: a.isActive ?? true,
    duration_override_minutes: a.durationOverrideMinutes ?? null,
    price_override: a.priceOverride ?? null,
    currency_override: a.currencyOverride ?? null,
    buffer_before_override_minutes: a.bufferBeforeOverrideMinutes ?? null,
    buffer_after_override_minutes: a.bufferAfterOverrideMinutes ?? null,
    sort_order: a.sortOrder ?? idx,
  }));

  // Call the atomic RPC
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("set_service_resources", {
    p_tenant_id: tenant.id,
    p_service_id: validated.serviceId,
    p_assignments: jsonbPayload,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("do not belong to this business")) {
      return { success: false, message: "One or more selected resources do not belong to this business." };
    }
    if (rpcError.message?.includes("Duplicate resource IDs")) {
      return { success: false, message: "Duplicate resources are not allowed." };
    }
    if (rpcError.message?.includes("Service not found")) {
      return { success: false, message: "Service not found in this business." };
    }
    if (rpcError.message?.includes("Currency override requires")) {
      return { success: false, message: "Currency override requires a price override." };
    }
    if (rpcError.message?.includes("Duration override")) {
      return { success: false, message: "Duration override must be between 5 and 1440 minutes." };
    }
    if (rpcError.message?.includes("Price override")) {
      return { success: false, message: "Price override cannot be negative." };
    }
    console.error("[set-service-resources]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to update service resources." };
  }

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/resources`);
  return { success: true, message: "Service resources updated." };
}
