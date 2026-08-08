"use server";

/**
 * Internal Review Management Actions — Milestone 8.7.
 *
 * Business response, moderation, and featured toggle.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { success: false; error: string };

// ─── Respond to Review ───────────────────────────────────────────────────────

export async function respondToReviewAction(
  tenantSlug: string,
  reviewId: string,
  input: { response: string }
): Promise<ActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin", "manager"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    if (!input.response?.trim()) {
      return { success: false, error: "Response cannot be empty." };
    }

    if (input.response.length > 2000) {
      return { success: false, error: "Response must be 2000 characters or fewer." };
    }

    const supabase = await createClient();

    const { error } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
      .from("customer_reviews" as never)
      .update({
        business_response: input.response.trim(),
        responded_at: new Date().toISOString(),
        responded_by: user.id,
      } as never)
      .eq("id" as never, reviewId)
      .eq("tenant_id" as never, tenant.id);

    if (error) return { success: false, error: "Failed to save response." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save response." };
  }
}

// ─── Moderate Review ─────────────────────────────────────────────────────────

export async function moderateReviewAction(
  tenantSlug: string,
  reviewId: string,
  input: { status: "published" | "hidden" | "flagged" }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const supabase = await createClient();

    const { error } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
      .from("customer_reviews" as never)
      .update({ status: input.status } as never)
      .eq("id" as never, reviewId)
      .eq("tenant_id" as never, tenant.id);

    if (error) return { success: false, error: "Failed to update review." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update review." };
  }
}

// ─── Toggle Featured ─────────────────────────────────────────────────────────

export async function toggleFeaturedReviewAction(
  tenantSlug: string,
  reviewId: string,
  isFeatured: boolean
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const supabase = await createClient();

    const { error } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
      .from("customer_reviews" as never)
      .update({ is_featured: isFeatured } as never)
      .eq("id" as never, reviewId)
      .eq("tenant_id" as never, tenant.id);

    if (error) return { success: false, error: "Failed to update review." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update review." };
  }
}
