"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { serviceSchema } from "../schemas/service-schema";
import type { ServiceActionResult } from "./create-service";

/**
 * Creates a service and atomically sets its location assignments.
 * This prevents leaving a partially configured service if the assignment step fails.
 */
export async function createServiceWithLocationsAction(
  tenantSlug: string,
  values: Record<string, unknown>,
  locationIds: string[]
): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role))
    return { success: false, message: "Only owners and admins can create services." };

  // Validate service fields
  let validated: ReturnType<typeof serviceSchema.validateSync>;
  try {
    validated = await serviceSchema.validate(values, { abortEarly: false, stripUnknown: true });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => {
        if (e.path) fieldErrors[e.path] = e.message;
      });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  // Next sort order within category
  const countQuery = supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);
  if (validated.serviceCategoryId) countQuery.eq("service_category_id", validated.serviceCategoryId);
  else countQuery.is("service_category_id", null);
  const { count } = await countQuery;

  // Insert the service
  const { data: newService, error: insertError } = await supabase
    .from("services")
    .insert({
      tenant_id: tenant.id,
      service_category_id: validated.serviceCategoryId ?? null,
      name: validated.name.trim(),
      slug: validated.slug.trim().toLowerCase(),
      description: validated.description ?? null,
      duration_minutes: validated.durationMinutes,
      price: validated.price,
      currency: validated.currency,
      buffer_before_minutes: validated.bufferBeforeMinutes,
      buffer_after_minutes: validated.bufferAfterMinutes,
      is_active: validated.isActive,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    if (insertError.message?.includes("category"))
      return { success: false, fieldErrors: { serviceCategoryId: "Invalid category for this business." } };
    console.error("[create-service-with-locations]", insertError.code, insertError.message);
    return { success: false, message: "Unable to create service." };
  }

  // Set location assignments if any were selected
  if (locationIds.length > 0 && newService) {
    // Note: RPC not in generated types until migration is applied and types regenerated
    const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ error: { message?: string; code?: string } | null }> }).rpc("set_service_locations", {
      p_tenant_id: tenant.id,
      p_service_id: newService.id,
      p_location_ids: locationIds,
    }));

    if (rpcError) {
      // Service was created but locations failed — log and report clearly
      console.error("[create-service-with-locations] location assignment failed:", rpcError.message);
      // Don't delete the service — let the user fix locations in edit mode
      revalidatePath(`/${tenantSlug}/services`);
      redirect(`/${tenantSlug}/services`);
    }
  }

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/locations`);
  redirect(`/${tenantSlug}/services`);
}
