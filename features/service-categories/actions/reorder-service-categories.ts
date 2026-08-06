"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ServiceCategoryActionResult } from "./create-service-category";

export async function reorderServiceCategoriesAction(tenantSlug: string, orderedIds: string[]): Promise<ServiceCategoryActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("reorder_service_categories", {
    target_tenant_id: tenant.id,
    ordered_category_ids: orderedIds,
  });

  if (error) {
    console.error("[reorder-categories] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) return { success: false, message: "Only owners and admins can reorder categories." };
    return { success: false, message: "Unable to reorder categories." };
  }

  revalidatePath(`/${tenantSlug}/services/categories`);
  return { success: true, message: "Order updated." };
}
