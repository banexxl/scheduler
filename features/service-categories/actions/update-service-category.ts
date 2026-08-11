"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { serviceCategorySchema } from "../schemas/service-category-schema";
import type { ServiceCategoryActionResult } from "./create-service-category";

export async function updateServiceCategoryAction(tenantSlug: string, categoryId: string, values: Record<string, unknown>): Promise<ServiceCategoryActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can update categories." };

  const { data: category } = await supabase.from("service_categories").select("id").eq("id", categoryId).eq("tenant_id", tenant.id).single();
  if (!category) return { success: false, message: "Category not found." };

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

  const { error } = await supabase.from("service_categories").update({
    name: validated.name.trim(),
    slug: validated.slug.trim().toLowerCase(),
    description: validated.description ?? null,
    is_active: validated.isActive,
  }).eq("id", categoryId).eq("tenant_id", tenant.id);

  if (error) {
    if (error.code === "23505") return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    console.error("[update-service-category]", error.code, error.message);
    return { success: false, message: "Unable to update category." };
  }

  revalidatePath(`/${tenantSlug}/services/categories`);
  return { success: true, message: "Category updated." };
}
