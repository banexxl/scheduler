"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import type { ServiceActionResult } from "./create-service";

export async function toggleServiceStatusAction(tenantSlug: string, serviceId: string, newStatus: boolean): Promise<ServiceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can change service status." };

  const { error } = await supabase.from("services").update({ is_active: newStatus }).eq("id", serviceId).eq("tenant_id", tenant.id);
  if (error) { console.error("[toggle-service]", error.code, error.message); return { success: false, message: "Unable to update status." }; }

  revalidatePath(`/${tenantSlug}/services`);
  return { success: true, message: newStatus ? "Service activated." : "Service deactivated." };
}
