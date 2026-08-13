import "server-only";

/**
 * Feature Override Resolution Service — Milestone 15.11.
 *
 * Resolves effective feature state considering:
 * 1. Platform tenant override (kill switch) — highest priority
 * 2. Tenant's own configuration
 *
 * Expired overrides are ignored (no cron needed to clean them up).
 * Tenant preference is NEVER overwritten — only shadowed while override is active.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlatformFeature =
  | "public_booking"
  | "online_payments"
  | "gift_cards"
  | "referrals"
  | "campaigns"
  | "automations"
  | "imports";

export type EffectiveFeatureState = {
  feature: PlatformFeature;
  enabled: boolean;
  source: "tenant_setting" | "platform_override";
  overrideReason?: string;
  overrideExpiresAt?: string | null;
};

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolves the effective feature state for a tenant.
 *
 * Priority:
 * 1. Active (non-expired) platform override → override wins
 * 2. Tenant's own setting → tenant choice
 *
 * Expired overrides are treated as non-existent.
 */
export async function resolveEffectiveFeatureState(
  tenantId: string,
  feature: PlatformFeature
): Promise<EffectiveFeatureState> {
  const supabase = createServiceRoleClient();

  // Check platform override
  const { data: override } = await supabase
    .from("platform_tenant_feature_overrides" as never)
    .select("enabled, reason, expires_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("feature" as never, feature)
    .single();

  if (override) {
    const row = override as unknown as { enabled: boolean; reason: string; expires_at: string | null };

    // Check expiry
    if (!row.expires_at || new Date(row.expires_at) > new Date()) {
      return {
        feature,
        enabled: row.enabled,
        source: "platform_override",
        overrideReason: row.reason,
        overrideExpiresAt: row.expires_at,
      };
    }
    // Expired — fall through to tenant setting
  }

  // No active override — use tenant setting (default: enabled)
  return {
    feature,
    enabled: true, // Default: features enabled unless tenant explicitly disables
    source: "tenant_setting",
  };
}

/**
 * Checks if a feature is effectively enabled for a tenant.
 * Quick boolean check for use in entry points.
 */
export async function isFeatureEnabled(
  tenantId: string,
  feature: PlatformFeature
): Promise<boolean> {
  const state = await resolveEffectiveFeatureState(tenantId, feature);
  return state.enabled;
}

/**
 * Gets all active overrides for a tenant (for support UI).
 */
export async function getTenantFeatureOverrides(
  tenantId: string
): Promise<Array<{ feature: string; enabled: boolean; reason: string; expiresAt: string | null; createdAt: string }>> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("platform_tenant_feature_overrides" as never)
    .select("feature, enabled, reason, expires_at, created_at" as never)
    .eq("tenant_id" as never, tenantId)
    .order("created_at" as never, { ascending: false });

  return ((data ?? []) as unknown as Array<{
    feature: string; enabled: boolean; reason: string; expires_at: string | null; created_at: string;
  }>).filter((o) => !o.expires_at || new Date(o.expires_at) > new Date())
    .map((o) => ({
      feature: o.feature,
      enabled: o.enabled,
      reason: o.reason,
      expiresAt: o.expires_at,
      createdAt: o.created_at,
    }));
}
