"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ServiceCategoryActionResult } from "./create-service-category";

export async function deleteServiceCategoryAction(tenantSlug: string, categoryId: string): Promise<ServiceCategoryActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can delete categories." };

  const { error } = await supabase.from("service_categories").delete().eq("id", categoryId).eq("tenant_id", tenant.id);
  if (error) {
    if (error.code === "23503") return { success: false, message: "This category is currently used by one or more services." };
    console.error("[delete-category]", error.code, error.message);
    return { success: false, message: "Unable to delete category." };
  }

  revalidatePath(`/${tenantSlug}/services/categories`);
  return { success: true, message: "Category deleted." };
}
