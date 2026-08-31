import Stack from "@mui/material/Stack";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveSiteConfig } from "@/features/public-site/utils/validate-site-config";
import { HOMEPAGE_LIMITS } from "@/features/homepage-builder/types";
import type { GalleryImage, Testimonial } from "@/features/homepage-builder/types";
import { getBusinessMedia } from "@/features/media/services/get-business-media";
import type { MediaAsset } from "@/features/media/types/media";
import PageHeader from "@/features/platform/components/page-header";
import PublicSiteEditorClient from "./client-page";

/**
 * Public Site Settings — Milestone 15.13.
 *
 * Allows owners/admins to configure the public website:
 * - Hero section
 * - Section ordering/visibility
 * - About content
 * - Featured services
 * - FAQ entries
 * - Social links
 * - SEO metadata
 * - Draft/publish workflow
 */
export default async function PublicSiteSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  // Load current site config state
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("tenant_public_site_settings" as never)
    .select("draft_config, published_config, draft_version, published_version, published_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .maybeSingle();

  const row = data as {
    draft_config?: unknown;
    published_config?: unknown;
    draft_version?: number;
    published_version?: number;
    published_at?: string;
  } | null;

  const draftConfig = resolveSiteConfig(row?.draft_config);
  const publishedVersion = row?.published_version ?? 0;
  const draftVersion = row?.draft_version ?? 1;
  const publishedAt = row?.published_at ?? null;
  const hasUnpublishedChanges = draftVersion > publishedVersion;

  // Load services for featured selection
  const { data: servicesData } = await supabase
    .from("services")
    .select("id, name, slug")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(100);

  const availableServices = ((servicesData ?? []) as unknown as Array<{ id: string; name: string; slug: string }>)
    .map(s => ({ id: s.id, name: s.name }));

  // Load gallery images and testimonials
  const [galleryResult, testimonialResult] = await Promise.all([
    supabase
      .from("tenant_gallery_images" as never)
      .select("id, image_url, alt_text, caption, sort_order" as never)
      .eq("tenant_id" as never, tenant.id)
      .order("sort_order" as never, { ascending: true })
      .limit(HOMEPAGE_LIMITS.maxGalleryImages),
    supabase
      .from("tenant_testimonials" as never)
      .select("id, author_name, rating, body, avatar_url, sort_order" as never)
      .eq("tenant_id" as never, tenant.id)
      .order("sort_order" as never, { ascending: true })
      .limit(HOMEPAGE_LIMITS.maxTestimonials),
  ]);

  const gallery: GalleryImage[] = ((galleryResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    imageUrl: r.image_url as string,
    altText: (r.alt_text as string) ?? null,
    caption: (r.caption as string) ?? null,
    sortOrder: r.sort_order as number,
  }));

  const testimonials: Testimonial[] = ((testimonialResult.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    authorName: r.author_name as string,
    rating: r.rating as number,
    body: r.body as string,
    avatarUrl: (r.avatar_url as string) ?? null,
    sortOrder: r.sort_order as number,
  }));

  // Load business logo
  let logoAssets: MediaAsset[] = [];
  try {
    const allMedia = await getBusinessMedia(tenant.id);
    logoAssets = allMedia.filter((m) => m.mediaRole === "logo");
  } catch {
    // Non-critical — logo section will just show empty
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Website"
        description="Configure your public business website, homepage content, and sections."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Website" },
        ]}
      />

      <PublicSiteEditorClient
        tenantSlug={tenantSlug}
        draftConfig={draftConfig}
        draftVersion={draftVersion}
        publishedVersion={publishedVersion}
        publishedAt={publishedAt}
        hasUnpublishedChanges={hasUnpublishedChanges}
        availableServices={availableServices}
        gallery={gallery}
        testimonials={testimonials}
        logoAssets={logoAssets}
      />
    </Stack>
  );
}
