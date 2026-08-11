"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { serviceCategorySchema } from "../schemas/service-category-schema";

export type ServiceCategoryActionResult = { success: boolean; message?: string; fieldErrors?: Record<string, string> };

export async function createServiceCategoryAction(tenantSlug: string, values: Record<string, unknown>): Promise<ServiceCategoryActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can create categories." };

  let validated: ReturnType<typeof serviceCategorySchema.validateSync>;
  try { validated = await serviceCategorySchema.validate(values, { abortEarly: false, stripUnknown: true }); }
  catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => { if (e.path) fieldErrors[e.path] = e.message; });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  // Next sort order
  const { count } = await supabase.from("service_categories").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);

  const { error: insertError } = await supabase.from("service_categories").insert({
    tenant_id: tenant.id,
    name: validated.name.trim(),
    slug: validated.slug.trim().toLowerCase(),
    description: validated.description ?? null,
    is_active: validated.isActive,
    sort_order: (count ?? 0),
  });

  if (insertError) {
    if (insertError.code === "23505") return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    console.error("[create-service-category]", insertError.code, insertError.message);
    return { success: false, message: "Unable to create category." };
  }

  revalidatePath(`/${tenantSlug}/services/categories`);
  redirect(`/${tenantSlug}/services/categories`);
}
