"use server";

/**
 * Update Review Settings — Milestone 8.7.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateReviewSettingsAction(
  tenantSlug: string,
  input: {
    reviewRequestsEnabled: boolean;
    reviewRequestDelayMinutes: number;
    showPublicReviews: boolean;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const supabase = await createClient();

    const { error } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
      .from("tenant_notification_settings" as never)
      .upsert({
        tenant_id: tenant.id,
        review_requests_enabled: input.reviewRequestsEnabled,
        review_request_delay_minutes: input.reviewRequestDelayMinutes,
        show_public_reviews: input.showPublicReviews,
      } as never, { onConflict: "tenant_id" } as never);

    if (error) return { success: false, error: "Failed to save review settings." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save review settings." };
  }
}
