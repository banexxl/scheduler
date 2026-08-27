import "server-only";

/**
 * Tenant Branding Loader — Milestone 16.1.
 *
 * Server-only module that resolves a tenant slug into a fully typed
 * TenantBranding payload for the public booking portal.
 *
 * Responsibilities:
 * 1. Resolve tenant from slug (active/trialing only)
 * 2. Load published branding config from tenant_branding_settings
 * 3. Merge defaults if branding is missing
 * 4. Detect the Google Font to load
 * 5. Return a strongly typed TenantBranding object
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import { detectSupportedFont } from "./font-loader";
import type { TenantBranding } from "@/types/branding";

/**
 * Result of resolving tenant branding from a slug.
 * `null` means the tenant was not found (caller should 404).
 */
export type BrandingResult =
  | { ok: true; branding: TenantBranding }
  | { ok: false };

/**
 * Loads tenant branding for a given slug.
 *
 * - Fetches tenant record (id, slug, name) from the tenants table.
 * - Resolves the published theme via the existing branding service.
 * - Detects the matching Google Font for next/font loading.
 * - Returns null-safe result; caller renders 404 on `ok: false`.
 */
export async function getTenantBranding(
  tenantSlug: string
): Promise<BrandingResult> {
  const supabase = createServiceRoleClient();

  // 1. Resolve tenant from slug
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, slug, name")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!tenant) {
    return { ok: false };
  }

  // 2. Resolve published theme (falls back to defaults internally)
  const theme = await resolvePublishedTenantTheme(tenant.id);

  // 3. Detect which Google Font to load from the resolved fontFamily
  const fontName = detectSupportedFont(theme.fontFamily);

  // 4. Return strongly typed branding payload
  return {
    ok: true,
    branding: {
      theme,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      fontName,
    },
  };
}
