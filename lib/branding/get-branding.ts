import "server-only";

/**
 * Tenant Branding Loader — Milestones 16.1, 16.2, 16.3.
 *
 * Server-only module that resolves a tenant slug into a fully typed
 * TenantBranding payload for the public booking portal.
 *
 * Responsibilities:
 * 1. Resolve tenant from slug (active/trialing only)
 * 2. Load published branding config from tenant_branding_settings
 * 3. Load active template
 * 4. Load portal data (contact info, address, hero config)
 * 5. Detect the Google Font to load
 * 6. Return a strongly typed TenantBranding object
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import { detectSupportedFont } from "./font-loader";
import { DEFAULT_TEMPLATE_ID } from "@/features/templates/types";
import type { TenantBranding } from "@/types/branding";
import type { PortalData, PortalAddress, PortalHeroConfig } from "@/features/customer-portal/types";

/**
 * Result of resolving tenant branding from a slug.
 * `null` means the tenant was not found (caller should 404).
 */
export type BrandingResult =
  | { ok: true; branding: TenantBranding }
  | { ok: false };

/**
 * Loads tenant branding + portal data for a given slug.
 */
export async function getTenantBranding(
  tenantSlug: string
): Promise<BrandingResult> {
  const supabase = createServiceRoleClient();

  // 1. Resolve tenant from slug (with extended fields for portal)
  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, slug, name, description, contact_email, contact_phone, website_url, social_links"
    )
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!tenant) {
    return { ok: false };
  }

  // 2. Resolve published theme (falls back to defaults internally)
  const theme = await resolvePublishedTenantTheme(tenant.id);

  // 2b. Resolve logo from media_assets
  const { data: logoAsset } = await supabase
    .from("media_assets")
    .select("storage_bucket, storage_path")
    .eq("tenant_id", tenant.id)
    .eq("media_role", "logo")
    .is("location_id", null)
    .is("resource_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (logoAsset) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    theme.logoUrl = `${supabaseUrl}/storage/v1/object/public/${logoAsset.storage_bucket}/${logoAsset.storage_path}`;
  }

  // 3. Template is always the default — template customization is disabled.
  const templateId = DEFAULT_TEMPLATE_ID;

  // 4. Load primary location for address
  const address = await loadPrimaryAddress(supabase, tenant.id);

  // 5. Load hero config from published site config
  const heroConfig = await loadHeroConfig(supabase, tenant.id);

  // 6. Detect which Google Font to load
  const fontName = detectSupportedFont(theme.fontFamily);

  // 7. Build portal data
  const portal: PortalData = {
    description: tenant.description ?? null,
    contactEmail: tenant.contact_email ?? null,
    contactPhone: tenant.contact_phone ?? null,
    websiteUrl: tenant.website_url ?? null,
    socialLinks: (tenant.social_links as Record<string, string>) ?? {},
    address,
    hero: heroConfig,
  };

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
      templateId,
      portal,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadPrimaryAddress(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string
): Promise<PortalAddress | null> {
  try {
    const { data } = await supabase
      .from("locations")
      .select(
        "street_address, city, province_state, postal_code, country"
      )
      .eq("tenant_id", tenantId)
      .eq("is_primary", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!data) return null;

    const row = data as {
      street_address: string | null;
      city: string | null;
      province_state: string | null;
      postal_code: string | null;
      country: string | null;
    };

    // Only return address if at least one field is populated
    if (!row.street_address && !row.city) return null;

    return {
      street: row.street_address,
      city: row.city,
      state: row.province_state,
      postalCode: row.postal_code,
      country: row.country,
    };
  } catch {
    return null;
  }
}

async function loadHeroConfig(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string
): Promise<PortalHeroConfig> {
  const defaultHero: PortalHeroConfig = {
    headline: null,
    subheadline: null,
    ctaLabel: "Book Now",
  };

  try {
    const { data } = await supabase
      .from("tenant_public_site_settings" as never)
      .select("published_config" as never)
      .eq("tenant_id" as never, tenantId)
      .maybeSingle();

    if (!data) return defaultHero;

    const config = (data as unknown as { published_config: unknown })
      .published_config;
    if (!config || typeof config !== "object") return defaultHero;

    const obj = config as Record<string, unknown>;
    const hero = obj.hero as Record<string, unknown> | undefined;
    if (!hero) return defaultHero;

    return {
      headline: typeof hero.headline === "string" ? hero.headline : null,
      subheadline: typeof hero.subheadline === "string" ? hero.subheadline : null,
      ctaLabel:
        typeof hero.primaryCtaLabel === "string" && hero.primaryCtaLabel
          ? hero.primaryCtaLabel
          : "Book Now",
    };
  } catch {
    return defaultHero;
  }
}
