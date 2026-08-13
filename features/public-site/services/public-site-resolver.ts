import "server-only";

/**
 * Public Site Resolver — Milestone 15.13.
 *
 * Resolves all data needed to render the tenant public website.
 * Anonymous-safe: uses only published config and public domain data.
 *
 * Architecture:
 * - Published site config (via get_published_site_config RPC)
 * - Published branding (via resolvePublishedTenantTheme)
 * - Canonical domain data (services, locations, staff, reviews, gallery)
 * - Social links from tenant record
 * - Feature override state
 *
 * Security:
 * - Never returns draft config to anonymous
 * - Never returns private member/customer data
 * - Bounded queries (no unlimited fetches)
 * - Tenant-scoped (no cross-tenant data)
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import { resolveSiteConfig } from "../utils/validate-site-config";
import { isFeatureEnabled } from "@/features/platform/services/feature-override-service";
import type { TenantPublicSiteConfig, SocialLink, ALLOWED_SOCIAL_PLATFORMS } from "../types/site-config";
import type { ResolvedTenantTheme } from "@/features/branding/types/branding-config";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PublicSiteResolution = {
  status: "ok" | "not_found" | "unavailable";
  data: ResolvedPublicSite | null;
};

export type ResolvedPublicSite = {
  tenant: PublicTenantInfo;
  theme: ResolvedTenantTheme;
  config: TenantPublicSiteConfig;
  services: PublicServiceItem[];
  locations: PublicLocationItem[];
  staff: PublicStaffItem[];
  reviews: PublicReviewData;
  gallery: PublicGalleryItem[];
  features: PublicFeatureState;
};

export type PublicTenantInfo = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  timeZone: string;
  socialLinks: SocialLink[];
};

export type PublicServiceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  sortOrder: number;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
};

export type PublicLocationItem = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  streetAddress: string | null;
  city: string | null;
  provinceState: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  email: string | null;
  timezone: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type PublicStaffItem = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  resourceId: string;
};

export type PublicReviewData = {
  reviews: PublicReviewItem[];
  summary: {
    count: number;
    averageRating: number | null;
    ratingDistribution: Record<string, number>;
  } | null;
};

export type PublicReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  serviceName: string | null;
  businessResponse: string | null;
  respondedAt: string | null;
  isFeatured: boolean;
  submittedAt: string;
};

export type PublicGalleryItem = {
  id: string;
  path: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
};

export type PublicFeatureState = {
  publicBookingEnabled: boolean;
  giftCardsEnabled: boolean;
  onlinePaymentsEnabled: boolean;
};

// ─── Main Resolver ───────────────────────────────────────────────────────────

/**
 * Resolves the complete public site for a tenant slug.
 * Returns null if tenant not found or unavailable.
 */
export async function resolvePublicSite(
  tenantSlug: string
): Promise<PublicSiteResolution> {
  const supabase = createServiceRoleClient();

  // 1. Resolve tenant
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, slug, name, description, default_timezone, social_links, status")
    .eq("slug", tenantSlug)
    .single();

  if (!tenantRow) {
    return { status: "not_found", data: null };
  }

  const tenant = tenantRow as unknown as {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    default_timezone: string;
    social_links: Record<string, string> | null;
    status: string;
  };

  if (!["active", "trialing"].includes(tenant.status)) {
    return { status: "unavailable", data: null };
  }

  const tenantId = tenant.id;

  // 2. Load published site config
  const { data: siteRow } = await supabase
    .from("tenant_public_site_settings" as never)
    .select("published_config" as never)
    .eq("tenant_id" as never, tenantId)
    .maybeSingle();

  const rawConfig = siteRow
    ? (siteRow as unknown as { published_config: unknown }).published_config
    : null;
  const config = resolveSiteConfig(rawConfig);

  // 3. Load published branding
  const theme = await resolvePublishedTenantTheme(tenantId);

  // 4. Load public data in parallel (bounded)
  const [services, locations, staff, reviews, gallery, features] = await Promise.all([
    loadPublicServices(supabase, tenantId),
    loadPublicLocations(supabase, tenantId),
    loadPublicStaff(supabase, tenantId),
    loadPublicReviews(supabase, tenantId),
    loadPublicGallery(supabase, tenantId),
    loadFeatureState(tenantId),
  ]);

  // 5. Resolve social links from tenant record
  const socialLinks = resolveTenantSocialLinks(tenant.social_links);

  return {
    status: "ok",
    data: {
      tenant: {
        id: tenantId,
        slug: tenant.slug,
        name: tenant.name,
        description: tenant.description,
        timeZone: tenant.default_timezone,
        socialLinks,
      },
      theme,
      config,
      services,
      locations,
      staff,
      reviews,
      gallery,
      features,
    },
  };
}

// ─── Data Loaders ────────────────────────────────────────────────────────────

type SupabaseClient = ReturnType<typeof createServiceRoleClient>;

async function loadPublicServices(supabase: SupabaseClient, tenantId: string): Promise<PublicServiceItem[]> {
  const { data } = await supabase
    .from("services")
    .select("id, name, slug, description, duration_minutes, price, currency, sort_order, service_category_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(100);

  if (!data) return [];

  // Load categories
  const categoryIds = [...new Set((data as unknown as Array<{ service_category_id: string | null }>).map(s => s.service_category_id).filter((id): id is string => Boolean(id)))];
  let categoryMap = new Map<string, { name: string; slug: string }>();

  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("service_categories")
      .select("id, name, slug")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", categoryIds);

    if (categories) {
      categoryMap = new Map(
        (categories as unknown as Array<{ id: string; name: string; slug: string }>)
          .map(c => [c.id, { name: c.name, slug: c.slug }])
      );
    }
  }

  return (data as unknown as Array<Record<string, unknown>>).map(row => {
    const catId = row.service_category_id as string | null;
    const cat = catId ? categoryMap.get(catId) : null;
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string | null,
      durationMinutes: row.duration_minutes as number,
      price: String(row.price),
      currency: row.currency as string,
      sortOrder: row.sort_order as number,
      categoryId: catId,
      categoryName: cat?.name ?? null,
      categorySlug: cat?.slug ?? null,
    };
  });
}

async function loadPublicLocations(supabase: SupabaseClient, tenantId: string): Promise<PublicLocationItem[]> {
  const { data } = await supabase
    .from("locations")
    .select("id, name, slug, description, street_address, city, province_state, postal_code, country, latitude, longitude, phone_number, email, timezone, is_primary, sort_order")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(50);

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    name: row.name as string,
    slug: (row.slug as string) ?? null,
    description: row.description as string | null,
    streetAddress: row.street_address as string | null,
    city: row.city as string | null,
    provinceState: row.province_state as string | null,
    postalCode: row.postal_code as string | null,
    country: row.country as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    phoneNumber: row.phone_number as string | null,
    email: row.email as string | null,
    timezone: row.timezone as string,
    isPrimary: row.is_primary as boolean,
    sortOrder: row.sort_order as number,
  }));
}

async function loadPublicStaff(supabase: SupabaseClient, tenantId: string): Promise<PublicStaffItem[]> {
  const { data } = await supabase
    .from("staff_profiles")
    .select("id, display_name, job_title, bio, avatar_url, resource_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .eq("is_public", true)
    .order("display_name", { ascending: true })
    .limit(50);

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    displayName: row.display_name as string,
    jobTitle: row.job_title as string | null,
    bio: row.bio as string | null,
    avatarUrl: row.avatar_url as string | null,
    resourceId: row.resource_id as string,
  }));
}

async function loadPublicReviews(supabase: SupabaseClient, tenantId: string): Promise<PublicReviewData> {
  // Check if public reviews enabled
  const { data: settingsRow } = await supabase
    .from("tenant_notification_settings")
    .select("show_public_reviews")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const showReviews = (settingsRow as unknown as { show_public_reviews?: boolean } | null)?.show_public_reviews ?? false;

  if (!showReviews) {
    return { reviews: [], summary: null };
  }

  // Load reviews
  const { data: reviewRows } = await supabase
    .from("customer_reviews")
    .select("id, rating, comment, customer_name_snapshot, service_name_snapshot, business_response, responded_at, is_featured, submitted_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(30);

  const reviews: PublicReviewItem[] = ((reviewRows ?? []) as unknown as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    rating: row.rating as number,
    comment: row.comment as string | null,
    reviewerName: row.customer_name_snapshot as string | null,
    serviceName: row.service_name_snapshot as string | null,
    businessResponse: row.business_response as string | null,
    respondedAt: row.responded_at as string | null,
    isFeatured: row.is_featured as boolean,
    submittedAt: row.submitted_at as string,
  }));

  // Summary
  const { data: summaryRows } = await supabase
    .from("customer_reviews")
    .select("rating")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .limit(1000);

  let summary: PublicReviewData["summary"] = null;
  if (summaryRows && (summaryRows as unknown[]).length > 0) {
    const ratings = (summaryRows as unknown as Array<{ rating: number }>).map(r => r.rating);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const r of ratings) {
      dist[String(r)] = (dist[String(r)] ?? 0) + 1;
    }
    summary = {
      count: ratings.length,
      averageRating: Math.round(avg * 10) / 10,
      ratingDistribution: dist,
    };
  }

  return { reviews, summary };
}

async function loadPublicGallery(supabase: SupabaseClient, tenantId: string): Promise<PublicGalleryItem[]> {
  const { data } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path, alt_text, caption, width, height, sort_order")
    .eq("tenant_id", tenantId)
    .eq("media_role", "gallery")
    .is("location_id", null)
    .is("resource_id", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(24);

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    path: `${row.storage_bucket}/${row.storage_path}`,
    altText: row.alt_text as string | null,
    caption: row.caption as string | null,
    width: row.width as number | null,
    height: row.height as number | null,
    sortOrder: row.sort_order as number,
  }));
}

async function loadFeatureState(tenantId: string): Promise<PublicFeatureState> {
  const [booking, giftCards, payments] = await Promise.all([
    isFeatureEnabled(tenantId, "public_booking"),
    isFeatureEnabled(tenantId, "gift_cards"),
    isFeatureEnabled(tenantId, "online_payments"),
  ]);

  return {
    publicBookingEnabled: booking,
    giftCardsEnabled: giftCards,
    onlinePaymentsEnabled: payments,
  };
}

// ─── Social Links Helper ─────────────────────────────────────────────────────

function resolveTenantSocialLinks(raw: Record<string, string> | null): SocialLink[] {
  if (!raw || typeof raw !== "object") return [];

  const links: SocialLink[] = [];
  const platformMap: Record<string, (typeof ALLOWED_SOCIAL_PLATFORMS)[number]> = {
    instagram: "instagram",
    facebook: "facebook",
    tiktok: "tiktok",
    youtube: "youtube",
    linkedin: "linkedin",
    x: "x",
    twitter: "x", // Map old twitter key to x
    website: "website",
  };

  for (const [key, url] of Object.entries(raw)) {
    const platform = platformMap[key];
    if (!platform) continue;
    if (typeof url !== "string" || !url.trim()) continue;
    // Basic protocol safety
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) continue;
    links.push({ platform, url: trimmed });
  }

  return links;
}
