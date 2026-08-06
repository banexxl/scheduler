"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { setServiceLocationsSchema } from "../schemas/service-location-schema";
import type { ServiceActionResult } from "./create-service";

/**
 * Atomically sets the locations assigned to a service using the database RPC.
 * Accepts an empty locationIds array to remove all assignments.
 */
export async function setServiceLocationsAction(
  tenantSlug: string,
  values: { serviceId: string; locationIds: string[] }
): Promise<ServiceActionResult> {
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
    return { success: false, message: "Only owners and admins can manage service locations." };

  // Validate input
  let validated: { serviceId: string; locationIds: string[] };
  try {
    validated = await setServiceLocationsSchema.validate(values, {
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

  // Call the atomic RPC
  // Note: RPC not in generated types until migration is applied and types regenerated
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("set_service_locations", {
    p_tenant_id: tenant.id,
    p_service_id: validated.serviceId,
    p_location_ids: validated.locationIds,
  }));

  if (rpcError) {
    if (rpcError.message?.includes("do not belong to this business")) {
      return { success: false, message: "One or more selected locations do not belong to this business." };
    }
    if (rpcError.message?.includes("Duplicate location IDs")) {
      return { success: false, message: "Duplicate locations are not allowed." };
    }
    if (rpcError.message?.includes("Service not found")) {
      return { success: false, message: "Service not found in this business." };
    }
    console.error("[set-service-locations]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to update service locations." };
  }

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/locations`);
  return { success: true, message: "Service locations updated." };
}
