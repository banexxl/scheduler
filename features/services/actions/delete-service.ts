"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ServiceActionResult } from "./create-service";

export async function deleteServiceAction(tenantSlug: string, serviceId: string): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can delete services." };

  const { error } = await supabase.from("services").delete().eq("id", serviceId).eq("tenant_id", tenant.id);
  if (error) {
    if (error.code === "23503") return { success: false, message: "This service has dependencies and cannot be deleted." };
    console.error("[delete-service]", error.code, error.message);
    return { success: false, message: "Unable to delete service." };
  }

  revalidatePath(`/${tenantSlug}/services`);
  return { success: true, message: "Service deleted." };
}
