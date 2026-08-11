"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ResourceActionResult } from "./create-resource-type";

export async function deleteResourceTypeAction(tenantSlug: string, typeId: string): Promise<ResourceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("delete_resource_type", { p_tenant_id: tenant.id, p_resource_type_id: typeId });

  if (error) {
    if (error.message?.includes("in use")) return { success: false, message: "This resource type is currently in use." };
    if (error.message?.includes("Unauthorized")) return { success: false, message: "Only owners and admins can delete resource types." };
    if (error.message?.includes("not found")) return { success: false, message: "Resource type not found." };
    console.error("[delete-resource-type]", error.code, error.message);
    return { success: false, message: "Unable to delete resource type." };
  }

  revalidatePath(`/${tenantSlug}/resources/types`);
  return { success: true, message: "Resource type deleted." };
}
