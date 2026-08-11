"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ResourceActionResult } from "./create-resource-type";

export async function deleteResourceAction(tenantSlug: string, resourceId: string): Promise<ResourceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_business_resource", { p_tenant_id: tenant.id, p_resource_id: resourceId });

  if (error) {
    if (error.message?.includes("Unauthorized")) return { success: false, message: "Only owners and admins can delete resources." };
    if (error.message?.includes("not found")) return { success: false, message: "Resource not found." };
    console.error("[delete-resource]", error.code, error.message);
    return { success: false, message: "Unable to delete resource." };
  }

  revalidatePath(`/${tenantSlug}/resources`);
  revalidatePath(`/${tenantSlug}/dashboard`);
  return { success: true, message: "Resource deleted." };
}
