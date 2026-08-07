"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { resourceSchema } from "../schemas/resource-schema";
import type { ResourceActionResult } from "./create-resource-type";
import { assertWithinLimit, getPlanLimit, resolveBillingState } from "@/features/billing/services/tenant-entitlements";

export async function createResourceAction(
  tenantSlug: string,
  values: Record<string, unknown>,
  options?: { shouldRedirect?: boolean }
): Promise<ResourceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("tenant_subscriptions")
    .select("access_state, status")
    .eq("tenant_id", tenant.id)
    .order("current_period_ends_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const billingState = resolveBillingState(subscription ?? {});
  const planLimit = getPlanLimit({ maxResources: 10 }, "maxResources");
  const usageCheck = assertWithinLimit({ currentUsage: 0, planLimit, resource: "resources" });
  if (!usageCheck.success && billingState !== "free") {
    return {
      success: false,
      code: usageCheck.code,
      message: `Your current plan supports up to ${usageCheck.limit} resources.`,
      limit: usageCheck.limit,
      current: usageCheck.current,
      resource: usageCheck.resource,
    } as ResourceActionResult;
  }

  let validated: ReturnType<typeof resourceSchema.validateSync>;
  try { validated = await resourceSchema.validate(values, { abortEarly: false, stripUnknown: true }); }
  catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => { if (e.path) fieldErrors[e.path] = e.message; });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  const { error } = await supabase.rpc("create_resource_with_locations", {
    p_tenant_id: tenant.id,
    p_resource_type_id: validated.resourceTypeId,
    p_name: validated.name.trim(),
    p_slug: validated.slug.trim().toLowerCase(),
    p_description: validated.description ?? undefined,
    p_email: validated.email ?? undefined,
    p_phone_number: validated.phoneNumber ?? undefined,
    p_is_active: validated.isActive,
    p_location_ids: validated.locationIds as string[],
    p_primary_location_id: validated.primaryLocationId,
  });

  if (error) {
    if (error.code === "23505" || error.message?.includes("duplicate") || error.message?.includes("unique")) {
      return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    }
    if (error.message?.includes("Unauthorized")) return { success: false, message: "Only owners and admins can create resources." };
    if (error.message?.includes("Resource type not found")) return { success: false, message: "Selected resource type is invalid." };
    if (error.message?.includes("locations do not belong")) return { success: false, message: "One or more selected locations are invalid." };
    console.error("[create-resource]", error.code, error.message);
    return { success: false, message: "Unable to create resource." };
  }

  revalidatePath(`/${tenantSlug}/resources`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  if (options?.shouldRedirect === false) {
    return { success: true, message: "Resource created successfully." };
  }

  redirect(`/${tenantSlug}/resources`);
}
