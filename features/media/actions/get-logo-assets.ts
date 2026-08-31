"use server";

/**
 * Server action to fetch business logo assets for a tenant.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessMedia } from "../services/get-business-media";
import type { MediaAsset } from "../types/media";

export async function getLogoAssetsAction(
  tenantSlug: string
): Promise<{ success: true; assets: MediaAsset[] } | { success: false }> {
  try {
    const { tenant } = await requireTenantMember(tenantSlug);
    const allMedia = await getBusinessMedia(tenant.id);
    const logos = allMedia.filter((m) => m.mediaRole === "logo");
    return { success: true, assets: logos };
  } catch {
    return { success: false };
  }
}
