"use server";

/**
 * Customer Favorite Actions — Milestone 9.3.
 *
 * Toggle favorites for businesses, services, and resources.
 * All actions verify active tenant link before allowing favorites.
 */

import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerAccountByUserId } from "../services/customer-account-queries";

type ActionResult = { success: true } | { success: false; error: string };

async function resolveAccountAndVerifyLink(tenantId: string): Promise<{ accountId: string } | null> {
  const user = await requireUser();
  const account = await getCustomerAccountByUserId(user.id);
  if (!account) return null;

  const supabase = createAdminClient();
  const { data: link } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("id" as never)
    .eq("customer_account_id" as never, account.id)
    .eq("tenant_id" as never, tenantId)
    .eq("link_status" as never, "linked")
    .single();

  if (!link) return null;
  return { accountId: account.id };
}

// ─── Toggle Favorite Business ────────────────────────────────────────────────

export async function toggleFavoriteBusinessAction(
  tenantId: string,
  isFavorite: boolean
): Promise<ActionResult> {
  try {
    const ctx = await resolveAccountAndVerifyLink(tenantId);
    if (!ctx) return { success: false, error: "Not authorized." };

    const supabase = createAdminClient();

    if (isFavorite) {
      await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("customer_favorite_tenants" as never)
        .upsert({ customer_account_id: ctx.accountId, tenant_id: tenantId } as never,
          { onConflict: "customer_account_id,tenant_id" } as never);
    } else {
      await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("customer_favorite_tenants" as never)
        .delete()
        .eq("customer_account_id" as never, ctx.accountId)
        .eq("tenant_id" as never, tenantId);
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update favorite." };
  }
}

// ─── Toggle Favorite Service ─────────────────────────────────────────────────

export async function toggleFavoriteServiceAction(
  tenantId: string,
  serviceId: string,
  isFavorite: boolean
): Promise<ActionResult> {
  try {
    const ctx = await resolveAccountAndVerifyLink(tenantId);
    if (!ctx) return { success: false, error: "Not authorized." };

    const supabase = createAdminClient();

    if (isFavorite) {
      await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("customer_favorite_services" as never)
        .upsert({ customer_account_id: ctx.accountId, tenant_id: tenantId, service_id: serviceId } as never,
          { onConflict: "customer_account_id,tenant_id,service_id" } as never);
    } else {
      await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("customer_favorite_services" as never)
        .delete()
        .eq("customer_account_id" as never, ctx.accountId)
        .eq("tenant_id" as never, tenantId)
        .eq("service_id" as never, serviceId);
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update favorite." };
  }
}

// ─── Toggle Favorite Resource ────────────────────────────────────────────────

export async function toggleFavoriteResourceAction(
  tenantId: string,
  resourceId: string,
  isFavorite: boolean
): Promise<ActionResult> {
  try {
    const ctx = await resolveAccountAndVerifyLink(tenantId);
    if (!ctx) return { success: false, error: "Not authorized." };

    const supabase = createAdminClient();

    if (isFavorite) {
      await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("customer_favorite_resources" as never)
        .upsert({ customer_account_id: ctx.accountId, tenant_id: tenantId, resource_id: resourceId } as never,
          { onConflict: "customer_account_id,tenant_id,resource_id" } as never);
    } else {
      await (supabase as never as ReturnType<typeof createAdminClient>)
        .from("customer_favorite_resources" as never)
        .delete()
        .eq("customer_account_id" as never, ctx.accountId)
        .eq("tenant_id" as never, tenantId)
        .eq("resource_id" as never, resourceId);
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update favorite." };
  }
}
