"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { serviceSchema } from "../schemas/service-schema";
import type { ServiceActionResult } from "./create-service";
import type { ServiceResourceAssignmentInput } from "../types/service-resource";
import { createClient } from "@/lib/supabase/server";

/**
 * Atomically creates a service with location and resource assignments
 * using the create_service_with_assignments database RPC.
 *
 * Everything happens in one transaction — if any part fails, the entire
 * operation is rolled back (no partially configured service left behind).
 */
export async function createServiceWithAssignmentsAction(
  tenantSlug: string,
  values: Record<string, unknown>,
  locationIds: string[],
  resourceAssignments: ServiceResourceAssignmentInput[],
  options?: { shouldRedirect?: boolean }
): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active", "trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  // Authenticated client — RLS policies fixed in migration 20260807000014
  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
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

  // Determine sort order within category
  const countQuery = supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);
  if (validated.serviceCategoryId) countQuery.eq("service_category_id", validated.serviceCategoryId);
  else countQuery.is("service_category_id", null);
  const { count } = await countQuery;

  // Convert resource assignments to JSONB payload
  const resourceJsonb = resourceAssignments.map((a, idx) => ({
    resource_id: a.resourceId,
    is_active: a.isActive ?? true,
    duration_override_minutes: a.durationOverrideMinutes ?? null,
    price_override: a.priceOverride ?? null,
    currency_override: a.currencyOverride ?? null,
    buffer_before_override_minutes: a.bufferBeforeOverrideMinutes ?? null,
    buffer_after_override_minutes: a.bufferAfterOverrideMinutes ?? null,
    sort_order: a.sortOrder ?? idx,
  }));

  // Call the atomic RPC (authenticated client provides auth.uid() needed inside)
  const { error: rpcError } = (await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: string | null; error: { message?: string; code?: string } | null }> }).rpc("create_service_with_assignments", {
    p_tenant_id: tenant.id,
    p_service_category_id: validated.serviceCategoryId ?? null,
    p_name: validated.name.trim(),
    p_slug: validated.slug.trim().toLowerCase(),
    p_description: validated.description ?? null,
    p_duration_minutes: validated.durationMinutes,
    p_price: validated.price,
    p_currency: validated.currency,
    p_buffer_before_minutes: validated.bufferBeforeMinutes,
    p_buffer_after_minutes: validated.bufferAfterMinutes,
    p_is_active: validated.isActive,
    p_sort_order: count ?? 0,
    p_location_ids: locationIds,
    p_resource_assignments: resourceJsonb,
  }));

  if (rpcError) {
    if (rpcError.code === "23505" || rpcError.message?.includes("duplicate key")) {
      return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    }
    if (rpcError.message?.includes("category")) {
      return { success: false, fieldErrors: { serviceCategoryId: "Invalid category for this business." } };
    }
    if (rpcError.message?.includes("locations do not belong")) {
      return { success: false, message: "One or more selected locations do not belong to this business." };
    }
    if (rpcError.message?.includes("resources do not belong")) {
      return { success: false, message: "One or more selected resources do not belong to this business." };
    }
    if (rpcError.message?.includes("Duplicate resource IDs")) {
      return { success: false, message: "Duplicate resource assignments are not allowed." };
    }
    if (rpcError.message?.includes("Currency override requires")) {
      return { success: false, message: "Currency override requires a price override." };
    }
    console.error("[create-service-with-assignments]", rpcError.code, rpcError.message);
    return { success: false, message: "Unable to create service." };
  }

  revalidatePath(`/${tenantSlug}/services`);
  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/resources`);

  if (options?.shouldRedirect === false) {
    return { success: true, message: "Service created successfully." };
  }

  redirect(`/${tenantSlug}/services`);
}
