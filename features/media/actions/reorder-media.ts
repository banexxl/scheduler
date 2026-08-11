"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";

export type ReorderMediaResult = { success: boolean; message?: string };

/**
 * Reorders media assets within a gallery collection using the reorder_media_assets RPC.
 */
export async function reorderMediaAction(
  tenantSlug: string,
  orderedIds: string[]
): Promise<ReorderMediaResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  const { error } = await supabase.rpc("reorder_media_assets", {
    target_tenant_id: tenant.id,
    ordered_ids: orderedIds,
  });

  if (error) {
    console.error("[reorder-media] RPC error:", error.code, error.message);
    if (error.message?.includes("Unauthorized")) return { success: false, message: "Only owners and admins can reorder media." };
    return { success: false, message: "Unable to reorder media." };
  }

  revalidatePath(`/${tenantSlug}/settings/media`);
  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/resources`);

  return { success: true, message: "Order updated." };
}
