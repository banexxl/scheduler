"use server";

/**
 * Tenant Deletion Actions — Milestone 13.2.
 *
 * Two-phase deletion:
 * 1. requestTenantDeletionPreview — shows summary + blockers
 * 2. deleteTenantPermanentlyAction — performs actual deletion
 *
 * Authorization: owner only.
 * Uses authenticated client for RPC (auth.uid() available in function context).
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DeletionPreviewResult =
  | { success: true; preview: TenantDeletionPreview }
  | { success: false; message: string };

export type TenantDeletionPreview = {
  tenantName: string;
  tenantSlug: string;
  blockers: {
    activeSubscription: boolean;
    pendingRefunds: boolean;
  };
  summary: {
    members: number;
    appointments: number;
    services: number;
    locations: number;
    resources: number;
    customers: number;
    payments: number;
    packages: number;
    reviews: number;
  };
};

export type DeleteTenantResult =
  | { success: true; message: string }
  | { success: false; message: string };

// ─── Preview Action ──────────────────────────────────────────────────────────

/**
 * Returns a deletion preview with counts and blockers.
 * Does NOT delete anything.
 */
export async function requestTenantDeletionPreviewAction(
  tenantSlug: string
): Promise<DeletionPreviewResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "tenant.deletion_preview",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_tenant_deletion_preview", {
    p_tenant_id: tenant.id,
    p_actor_user_id: user.id,
  });

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to load deletion preview." };
  }

  const result = data as unknown as Record<string, unknown>;

  if (result?.status === "unauthorized") {
    await log.unauthorized();
    return { success: false, message: "Only owners can delete a business." };
  }

  if (result?.status === "not_found") {
    return { success: false, message: "Business not found." };
  }

  const blockers = result?.blockers as Record<string, boolean> | undefined;
  const summary = result?.summary as Record<string, number> | undefined;

  await log.success({ hasBlockers: !!(blockers?.active_subscription || blockers?.pending_refunds) });

  return {
    success: true,
    preview: {
      tenantName: String(result?.tenant_name ?? ""),
      tenantSlug: String(result?.tenant_slug ?? ""),
      blockers: {
        activeSubscription: blockers?.active_subscription ?? false,
        pendingRefunds: blockers?.pending_refunds ?? false,
      },
      summary: {
        members: summary?.members ?? 0,
        appointments: summary?.appointments ?? 0,
        services: summary?.services ?? 0,
        locations: summary?.locations ?? 0,
        resources: summary?.resources ?? 0,
        customers: summary?.customers ?? 0,
        payments: summary?.payments ?? 0,
        packages: summary?.packages ?? 0,
        reviews: summary?.reviews ?? 0,
      },
    },
  };
}

// ─── Permanent Deletion Action ───────────────────────────────────────────────

/**
 * Permanently deletes a tenant and all associated data.
 *
 * Requires:
 * - Authenticated owner
 * - confirmationSlug matching the tenant's actual slug
 * - No active subscription
 * - No pending refunds
 */
export async function deleteTenantPermanentlyAction(
  tenantSlug: string,
  confirmationSlug: string
): Promise<DeleteTenantResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  // Client-side confirmation check (defense in depth — RPC also verifies)
  if (confirmationSlug !== tenant.slug) {
    return { success: false, message: "Confirmation does not match. Please type the exact business URL." };
  }

  const log = createServerActionLogger({
    action: "tenant.delete_permanently",
    tenantId: tenant.id,
    userId: user.id,
  });

  log.info("deletion requested", { slug: tenant.slug });

  // Use service-role client because delete_tenant_permanently is restricted from authenticated
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("delete_tenant_permanently", {
    p_tenant_id: tenant.id,
    p_actor_user_id: user.id,
    p_confirmation_slug: confirmationSlug,
  });

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to delete business. Please try again." };
  }

  const result = data as unknown as Record<string, unknown>;

  switch (result?.status) {
    case "deleted":
      await log.success({ tenantSlug: tenant.slug });
      revalidatePath("/");
      redirect("/create-business");
      // redirect throws, but TypeScript doesn't know that
      return { success: true, message: "Business deleted." };

    case "unauthorized":
      await log.unauthorized();
      return { success: false, message: "Only owners can delete a business." };

    case "confirmation_mismatch":
      return { success: false, message: "Confirmation does not match." };

    case "active_subscription":
      return { success: false, message: String(result?.message ?? "Cancel your subscription first.") };

    case "not_found":
      return { success: false, message: "Business not found." };

    default:
      await log.failure(new Error(`Unexpected RPC status: ${result?.status}`));
      return { success: false, message: "Unable to delete business." };
  }
}
