import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Dynamic Sitemap for Tenant Public Pages — Milestone 15.13.
 *
 * Generates sitemap entries for:
 * - Homepage (/book/{slug})
 * - Service detail pages (/book/{slug}/services/{serviceSlug})
 * - Location detail pages (/book/{slug}/locations/{locationSlug})
 * - Staff profile pages (/book/{slug}/staff/{staffId}) — only public profiles
 *
 * Excludes:
 * - Portal/session/token routes
 * - Payment return routes
 * - Review token routes
 * - Waitlist token routes
 * - Appointment management token routes
 * - Unsubscribe routes
 * - Gift card purchase routes (dynamic checkout)
 */

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://get-slot.app";

export default async function sitemap({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<MetadataRoute.Sitemap> {
  const { tenantSlug } = await params;
  const supabase = createServiceRoleClient();

  // Resolve tenant
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, status")
    .eq("slug", tenantSlug)
    .single();

  if (!tenantRow || !["active", "trialing"].includes((tenantRow as { status: string }).status)) {
    return [];
  }

  const tenantId = (tenantRow as { id: string }).id;
  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: `${BASE_URL}/book/${tenantSlug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  });

  // Services
  const { data: services } = await supabase
    .from("services")
    .select("slug, updated_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(200);

  for (const svc of (services ?? []) as unknown as Array<{ slug: string; updated_at: string }>) {
    entries.push({
      url: `${BASE_URL}/book/${tenantSlug}/services/${svc.slug}`,
      lastModified: new Date(svc.updated_at),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Locations
  const { data: locations } = await supabase
    .from("locations")
    .select("slug, id, updated_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(50);

  for (const loc of (locations ?? []) as unknown as Array<{ slug: string | null; id: string; updated_at: string }>) {
    const locIdentifier = loc.slug || loc.id;
    entries.push({
      url: `${BASE_URL}/book/${tenantSlug}/locations/${locIdentifier}`,
      lastModified: new Date(loc.updated_at),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  // Public staff profiles
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select("id, updated_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("is_public", true)
    .limit(50);

  for (const sp of (staff ?? []) as unknown as Array<{ id: string; updated_at: string }>) {
    entries.push({
      url: `${BASE_URL}/book/${tenantSlug}/staff/${sp.id}`,
      lastModified: new Date(sp.updated_at),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
