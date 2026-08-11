"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { serviceSchema } from "../schemas/service-schema";
import type { ServiceActionResult } from "./create-service";

export async function updateServiceAction(tenantSlug: string, serviceId: string, values: Record<string, unknown>): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can update services." };

  const { data: svc } = await supabase.from("services").select("id").eq("id", serviceId).eq("tenant_id", tenant.id).single();
  if (!svc) return { success: false, message: "Service not found." };

  let validated: ReturnType<typeof serviceSchema.validateSync>;
  try { validated = await serviceSchema.validate(values, { abortEarly: false, stripUnknown: true }); }
  catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => { if (e.path) fieldErrors[e.path] = e.message; });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  const { error } = await supabase.from("services").update({
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
  }).eq("id", serviceId).eq("tenant_id", tenant.id);

  if (error) {
    if (error.code === "23505") return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    if (error.message?.includes("category")) return { success: false, fieldErrors: { serviceCategoryId: "Invalid category for this business." } };
    console.error("[update-service]", error.code, error.message);
    return { success: false, message: "Unable to update service." };
  }

  revalidatePath(`/${tenantSlug}/services`);
  return { success: true, message: "Service updated." };
}
