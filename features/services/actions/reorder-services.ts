"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ServiceActionResult } from "./create-service";

export async function reorderServicesAction(tenantSlug: string, categoryId: string | null, orderedIds: string[]): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("reorder_services", {
    target_tenant_id: tenant.id,
    target_category_id: categoryId,
    ordered_service_ids: orderedIds,
  });

  if (error) {
    console.error("[reorder-services]", error.code, error.message);
    if (error.message?.includes("Unauthorized")) return { success: false, message: "Only owners and admins can reorder services." };
    return { success: false, message: "Unable to reorder services." };
  }

  revalidatePath(`/${tenantSlug}/services`);
  return { success: true, message: "Order updated." };
}
