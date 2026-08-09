import "server-only";

/**
 * Provider Resource Sync Service — Milestone 11.7.
 *
 * Synchronizes local tenant resources (products, discounts) to Polar.
 * Local-first model: local record exists before provider call.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging";
import type { SyncResourceResult, ProviderResourceType } from "../types/provider-resource";

// ─── Polar API Helpers ───────────────────────────────────────────────────────

async function polarFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error("Polar not configured.");

  const baseUrl = (process.env.POLAR_API_BASE_URL ?? "https://api.polar.sh").replace(/\/$/, "");
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Polar API error (${response.status}): ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

// ─── Create Provider Mapping ─────────────────────────────────────────────────

export async function createProviderMapping(
  tenantId: string,
  resourceType: ProviderResourceType,
  localResourceId: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_resources" as never)
    .insert({
      tenant_id: tenantId,
      provider: "polar",
      resource_type: resourceType,
      local_resource_id: localResourceId,
      sync_status: "pending",
    } as never)
    .select("id")
    .single();

  if (error || !data) throw new Error("Failed to create provider mapping.");
  return (data as unknown as { id: string }).id;
}

// ─── Sync Discount to Polar ──────────────────────────────────────────────────

export async function syncDiscountToProvider(
  tenantId: string,
  discountId: string
): Promise<SyncResourceResult> {
  const supabase = createAdminClient();

  // Load mapping
  const { data: mappingRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_resources" as never)
    .select("id, sync_version, provider_resource_id, sync_status" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("resource_type" as never, "discount")
    .eq("local_resource_id" as never, discountId)
    .single();

  if (!mappingRow) return { success: false, error: "No mapping found.", syncStatus: "failed" };

  const mapping = mappingRow as unknown as {
    id: string; sync_version: number; provider_resource_id: string | null; sync_status: string;
  };

  // Load discount
  const { data: discountRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenant_discounts" as never)
    .select("name, code, discount_type, percentage, fixed_amount, currency, starts_at, ends_at, maximum_redemptions" as never)
    .eq("id" as never, discountId)
    .eq("tenant_id" as never, tenantId)
    .single();

  if (!discountRow) return { success: false, error: "Discount not found.", syncStatus: "failed" };

  const discount = discountRow as unknown as {
    name: string; code: string | null; discount_type: string;
    percentage: number | null; fixed_amount: number | null; currency: string | null;
    starts_at: string | null; ends_at: string | null; maximum_redemptions: number | null;
  };

  // Mark syncing
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_resources" as never)
    .update({ sync_status: "syncing", last_sync_attempt_at: new Date().toISOString() } as never)
    .eq("id" as never, mapping.id);

  // Build Polar payload
  const providerCode = discount.code ? `${tenantId.slice(0, 8)}_${discount.code}` : null;

  const payload: Record<string, unknown> = {
    name: discount.name,
    type: discount.discount_type,
    metadata: {
      source: "get-slot",
      tenant_id: tenantId,
      local_resource_id: discountId,
    },
  };

  if (discount.discount_type === "percentage" && discount.percentage) {
    payload.basis_points = discount.percentage * 100; // Polar uses basis points
  } else if (discount.discount_type === "fixed" && discount.fixed_amount) {
    payload.amount = discount.fixed_amount;
    payload.currency = discount.currency?.toLowerCase();
  }

  if (providerCode) payload.code = providerCode;
  if (discount.starts_at) payload.starts_at = discount.starts_at;
  if (discount.ends_at) payload.ends_at = discount.ends_at;
  if (discount.maximum_redemptions) payload.max_redemptions = discount.maximum_redemptions;

  try {
    let providerResourceId: string;

    if (mapping.provider_resource_id) {
      // Update existing
      const response = await polarFetch<Record<string, unknown>>(
        `/v1/discounts/${mapping.provider_resource_id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      providerResourceId = String(response.id ?? mapping.provider_resource_id);
    } else {
      // Create new
      const response = await polarFetch<Record<string, unknown>>(
        "/v1/discounts",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      providerResourceId = String(response.id ?? "");
      if (!providerResourceId) throw new Error("Polar discount response missing ID.");
    }

    // Mark synced (verify version hasn't changed)
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_provider_resources" as never)
      .update({
        provider_resource_id: providerResourceId,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
        sync_error_code: null,
        sync_error_message: null,
      } as never)
      .eq("id" as never, mapping.id)
      .eq("sync_version" as never, mapping.sync_version);

    logger.info("provider_discount_synced", { tenantId, operation: "discount_sync" });
    return { success: true, providerResourceId, syncStatus: "synced" };
  } catch (error) {
    const msg = error instanceof Error ? error.message.slice(0, 200) : "Unknown";

    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_provider_resources" as never)
      .update({
        sync_status: "failed",
        sync_error_code: "PROVIDER_ERROR",
        sync_error_message: msg,
      } as never)
      .eq("id" as never, mapping.id);

    logger.error("provider_discount_sync_failed", { tenantId, errorCategory: "EXTERNAL_PROVIDER" }, error);
    return { success: false, error: msg, syncStatus: "failed" };
  }
}

// ─── Get Provider Discount ID ────────────────────────────────────────────────

export async function getProviderDiscountId(
  tenantId: string,
  discountId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("payment_provider_resources" as never)
    .select("provider_resource_id, sync_status" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("resource_type" as never, "discount")
    .eq("local_resource_id" as never, discountId)
    .eq("sync_status" as never, "synced")
    .maybeSingle();

  if (!data) return null;
  return (data as unknown as { provider_resource_id: string }).provider_resource_id;
}
