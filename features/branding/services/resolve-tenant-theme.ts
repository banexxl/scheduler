import "server-only";

/**
 * Tenant Public Theme Resolver — Milestone 14.4.
 *
 * Resolves published branding config into a render-safe ResolvedTenantTheme.
 * Falls back to defaults for missing/invalid branding.
 * Used by all tenant-specific public/customer surfaces.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveBrandingConfig } from "../utils/validate-branding-config";
import { resolveForeground, resolveMutedText, resolveBorderColor } from "../utils/color-utils";
import {
  type ResolvedTenantTheme,
  type TenantBrandingConfig,
  DEFAULT_BRANDING_CONFIG,
  FONT_FAMILY_MAP,
  RADIUS_MAP,
} from "../types/branding-config";

/**
 * Resolves the published theme for a tenant by ID.
 * Returns a safe default if no branding is configured.
 */
export async function resolvePublishedTenantTheme(
  tenantId: string
): Promise<ResolvedTenantTheme> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("tenant_branding_settings")
      .select("published_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const config = resolveBrandingConfig(
      (data as { published_config?: unknown } | null)?.published_config
    );
    return configToTheme(config);
  } catch {
    return configToTheme(DEFAULT_BRANDING_CONFIG);
  }
}

/**
 * Resolves the draft theme for preview (authenticated editor only).
 */
export async function resolveDraftTenantTheme(
  tenantId: string
): Promise<{ theme: ResolvedTenantTheme; draftVersion: number }> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("tenant_branding_settings")
    .select("draft_config, draft_version")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const row = data as { draft_config?: unknown; draft_version?: number } | null;
  const config = resolveBrandingConfig(row?.draft_config);
  return {
    theme: configToTheme(config),
    draftVersion: row?.draft_version ?? 1,
  };
}

/**
 * Converts a validated TenantBrandingConfig into a render-safe ResolvedTenantTheme.
 * Derives text/border colors from background for accessibility.
 */
function configToTheme(config: TenantBrandingConfig): ResolvedTenantTheme {
  // Always use dark mode — branding customization is disabled.
  const bg = "#0a0a0f";
  const surface = "#16161e";
  const primaryColor = "#7C3AED";
  const accentColor = "#06B6D4";

  return {
    primaryColor,
    accentColor,
    backgroundColor: bg,
    surfaceColor: surface,
    textColor: "#f0f0f5",
    mutedTextColor: "#8b8b9e",
    borderColor: "rgba(255, 255, 255, 0.06)",
    appearance: "dark",
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    borderRadius: 12,
    heroLayout: config.heroLayout,
    logoUrl: null,
    coverUrl: null,
    tagline: config.tagline,
  };
}
