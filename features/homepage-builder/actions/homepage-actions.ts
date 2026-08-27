"use server";

/**
 * Homepage Builder Server Actions — Milestone 16.4.
 *
 * CRUD for homepage content, gallery images, and testimonials.
 */

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import {
  DEFAULT_HOMEPAGE_CONTENT,
  HOMEPAGE_SECTION_IDS,
  HOMEPAGE_LIMITS,
  type HomepageContent,
  type HomepageSectionId,
  type CtaTarget,
  type GalleryImage,
  type Testimonial,
  type HomepageData,
} from "../types";

type ActionResult =
  | { success: true; message?: string }
  | { success: false; message: string };

// ─── Get Homepage Content ────────────────────────────────────────────────────

/**
 * Loads homepage content + gallery + testimonials for the builder.
 * Creates a default row if none exists.
 */
export async function getHomepageContent(
  tenantSlug: string
): Promise<{ success: true; data: HomepageData } | { success: false; message: string }> {
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();

  // Load or create homepage row
  let { data: row } = await supabase
    .from("tenant_homepage" as never)
    .select("*" as never)
    .eq("tenant_id" as never, tenant.id)
    .maybeSingle();

  if (!row) {
    await supabase
      .from("tenant_homepage" as never)
      .insert({
        tenant_id: tenant.id,
        hero_cta_label: DEFAULT_HOMEPAGE_CONTENT.heroCtaLabel,
        hero_cta_target: DEFAULT_HOMEPAGE_CONTENT.heroCtaTarget,
        section_order: DEFAULT_HOMEPAGE_CONTENT.sectionOrder,
        section_visibility: DEFAULT_HOMEPAGE_CONTENT.sectionVisibility,
      } as never);

    const { data: created } = await supabase
      .from("tenant_homepage" as never)
      .select("*" as never)
      .eq("tenant_id" as never, tenant.id)
      .single();
    row = created;
  }

  const hp = row as unknown as Record<string, unknown>;

  const content: HomepageContent = {
    heroTitle: (hp.hero_title as string) ?? null,
    heroSubtitle: (hp.hero_subtitle as string) ?? null,
    heroCtaLabel: (hp.hero_cta_label as string) || "Book Now",
    heroCtaTarget: (hp.hero_cta_target as CtaTarget) || "services",
    aboutTitle: (hp.about_title as string) ?? null,
    aboutBody: (hp.about_body as string) ?? null,
    aboutImageUrl: (hp.about_image_url as string) ?? null,
    sectionOrder: Array.isArray(hp.section_order)
      ? (hp.section_order as HomepageSectionId[])
      : DEFAULT_HOMEPAGE_CONTENT.sectionOrder,
    sectionVisibility: hp.section_visibility && typeof hp.section_visibility === "object"
      ? (hp.section_visibility as Record<HomepageSectionId, boolean>)
      : DEFAULT_HOMEPAGE_CONTENT.sectionVisibility,
  };

  // Load gallery
  const { data: galleryRows } = await supabase
    .from("tenant_gallery_images" as never)
    .select("id, image_url, alt_text, caption, sort_order" as never)
    .eq("tenant_id" as never, tenant.id)
    .order("sort_order" as never, { ascending: true })
    .limit(HOMEPAGE_LIMITS.maxGalleryImages);

  const gallery: GalleryImage[] = ((galleryRows ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    imageUrl: r.image_url as string,
    altText: (r.alt_text as string) ?? null,
    caption: (r.caption as string) ?? null,
    sortOrder: r.sort_order as number,
  }));

  // Load testimonials
  const { data: testimonialRows } = await supabase
    .from("tenant_testimonials" as never)
    .select("id, author_name, rating, body, avatar_url, sort_order" as never)
    .eq("tenant_id" as never, tenant.id)
    .order("sort_order" as never, { ascending: true })
    .limit(HOMEPAGE_LIMITS.maxTestimonials);

  const testimonials: Testimonial[] = ((testimonialRows ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    authorName: r.author_name as string,
    rating: r.rating as number,
    body: r.body as string,
    avatarUrl: (r.avatar_url as string) ?? null,
    sortOrder: r.sort_order as number,
  }));

  return { success: true, data: { content, gallery, testimonials } };
}

// ─── Update Homepage Content ─────────────────────────────────────────────────

export async function updateHomepageContent(
  tenantSlug: string,
  content: Partial<HomepageContent>
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.update", tenantId: tenant.id, userId: user.id });

  const updateData: Record<string, unknown> = {};

  if (content.heroTitle !== undefined) updateData.hero_title = content.heroTitle?.slice(0, HOMEPAGE_LIMITS.heroTitle) ?? null;
  if (content.heroSubtitle !== undefined) updateData.hero_subtitle = content.heroSubtitle?.slice(0, HOMEPAGE_LIMITS.heroSubtitle) ?? null;
  if (content.heroCtaLabel !== undefined) updateData.hero_cta_label = content.heroCtaLabel?.slice(0, HOMEPAGE_LIMITS.heroCtaLabel) || "Book Now";
  if (content.heroCtaTarget !== undefined) updateData.hero_cta_target = content.heroCtaTarget;
  if (content.aboutTitle !== undefined) updateData.about_title = content.aboutTitle?.slice(0, HOMEPAGE_LIMITS.aboutTitle) ?? null;
  if (content.aboutBody !== undefined) updateData.about_body = content.aboutBody?.slice(0, HOMEPAGE_LIMITS.aboutBody) ?? null;
  if (content.aboutImageUrl !== undefined) updateData.about_image_url = content.aboutImageUrl ?? null;
  if (content.sectionOrder !== undefined) updateData.section_order = content.sectionOrder;
  if (content.sectionVisibility !== undefined) updateData.section_visibility = content.sectionVisibility;

  // Upsert
  const { error } = await supabase
    .from("tenant_homepage" as never)
    .upsert({ tenant_id: tenant.id, ...updateData } as never, { onConflict: "tenant_id" });

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to save homepage content." };
  }

  await log.success({ fields: Object.keys(updateData) });
  revalidatePath(`/book/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/site/homepage`);
  return { success: true, message: "Homepage updated." };
}

// ─── Reorder Sections ────────────────────────────────────────────────────────

export async function reorderSections(
  tenantSlug: string,
  order: HomepageSectionId[]
): Promise<ActionResult> {
  // Validate all IDs
  const valid = order.every((id) => HOMEPAGE_SECTION_IDS.includes(id));
  if (!valid) return { success: false, message: "Invalid section order." };

  return updateHomepageContent(tenantSlug, { sectionOrder: order });
}

// ─── Testimonial CRUD ────────────────────────────────────────────────────────

export async function createTestimonial(
  tenantSlug: string,
  values: { authorName: string; rating: number; body: string; avatarUrl?: string }
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.testimonial.create", tenantId: tenant.id, userId: user.id });

  // Get next sort order
  const { data: existing } = await supabase
    .from("tenant_testimonials" as never)
    .select("sort_order" as never)
    .eq("tenant_id" as never, tenant.id)
    .order("sort_order" as never, { ascending: false })
    .limit(1);

  const nextOrder = ((existing as unknown as Array<{ sort_order: number }>) ?? [])[0]?.sort_order ?? -1;

  const { error } = await supabase
    .from("tenant_testimonials" as never)
    .insert({
      tenant_id: tenant.id,
      author_name: values.authorName.slice(0, HOMEPAGE_LIMITS.testimonialAuthor),
      rating: Math.min(5, Math.max(1, values.rating)),
      body: values.body.slice(0, HOMEPAGE_LIMITS.testimonialBody),
      avatar_url: values.avatarUrl || null,
      sort_order: nextOrder + 1,
    } as never);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to create testimonial." };
  }

  await log.success({});
  revalidatePath(`/book/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/site/homepage`);
  return { success: true, message: "Testimonial added." };
}

export async function updateTestimonial(
  tenantSlug: string,
  testimonialId: string,
  values: { authorName: string; rating: number; body: string; avatarUrl?: string }
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.testimonial.update", tenantId: tenant.id, userId: user.id });

  const { error } = await supabase
    .from("tenant_testimonials" as never)
    .update({
      author_name: values.authorName.slice(0, HOMEPAGE_LIMITS.testimonialAuthor),
      rating: Math.min(5, Math.max(1, values.rating)),
      body: values.body.slice(0, HOMEPAGE_LIMITS.testimonialBody),
      avatar_url: values.avatarUrl || null,
    } as never)
    .eq("id" as never, testimonialId)
    .eq("tenant_id" as never, tenant.id);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to update testimonial." };
  }

  await log.success({ testimonialId });
  revalidatePath(`/book/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/site/homepage`);
  return { success: true, message: "Testimonial updated." };
}

export async function deleteTestimonial(
  tenantSlug: string,
  testimonialId: string
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.testimonial.delete", tenantId: tenant.id, userId: user.id });

  const { error } = await supabase
    .from("tenant_testimonials" as never)
    .delete()
    .eq("id" as never, testimonialId)
    .eq("tenant_id" as never, tenant.id);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to delete testimonial." };
  }

  await log.success({ testimonialId });
  revalidatePath(`/book/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/site/homepage`);
  return { success: true, message: "Testimonial deleted." };
}

// ─── Gallery CRUD ────────────────────────────────────────────────────────────

export async function addGalleryImage(
  tenantSlug: string,
  values: { imageUrl: string; altText?: string; caption?: string }
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.gallery.add", tenantId: tenant.id, userId: user.id });

  // Check limit
  const { count } = await supabase
    .from("tenant_gallery_images" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("tenant_id" as never, tenant.id);

  if ((count ?? 0) >= HOMEPAGE_LIMITS.maxGalleryImages) {
    return { success: false, message: `Maximum ${HOMEPAGE_LIMITS.maxGalleryImages} gallery images allowed.` };
  }

  // Get next sort order
  const { data: existing } = await supabase
    .from("tenant_gallery_images" as never)
    .select("sort_order" as never)
    .eq("tenant_id" as never, tenant.id)
    .order("sort_order" as never, { ascending: false })
    .limit(1);

  const nextOrder = ((existing as unknown as Array<{ sort_order: number }>) ?? [])[0]?.sort_order ?? -1;

  const { error } = await supabase
    .from("tenant_gallery_images" as never)
    .insert({
      tenant_id: tenant.id,
      image_url: values.imageUrl,
      alt_text: values.altText?.slice(0, HOMEPAGE_LIMITS.galleryAltText) || null,
      caption: values.caption?.slice(0, HOMEPAGE_LIMITS.galleryCaption) || null,
      sort_order: nextOrder + 1,
    } as never);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to add gallery image." };
  }

  await log.success({});
  revalidatePath(`/book/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/site/homepage`);
  return { success: true, message: "Image added." };
}

export async function deleteGalleryImage(
  tenantSlug: string,
  imageId: string
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.gallery.delete", tenantId: tenant.id, userId: user.id });

  const { error } = await supabase
    .from("tenant_gallery_images" as never)
    .delete()
    .eq("id" as never, imageId)
    .eq("tenant_id" as never, tenant.id);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to delete image." };
  }

  await log.success({ imageId });
  revalidatePath(`/book/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/site/homepage`);
  return { success: true, message: "Image deleted." };
}

export async function reorderGalleryImages(
  tenantSlug: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();
  const log = createServerActionLogger({ action: "homepage.gallery.reorder", tenantId: tenant.id, userId: user.id });

  // Update sort_order for each image
  for (let i = 0; i < orderedIds.length; i++) {
    const imageId = orderedIds[i];
    if (!imageId) continue;
    await supabase
      .from("tenant_gallery_images" as never)
      .update({ sort_order: i } as never)
      .eq("id" as never, imageId)
      .eq("tenant_id" as never, tenant.id);
  }

  await log.success({ count: orderedIds.length });
  revalidatePath(`/book/${tenantSlug}`);
  return { success: true, message: "Gallery reordered." };
}

// ─── Public Homepage Loader ──────────────────────────────────────────────────

/**
 * Loads homepage data for public rendering.
 * Used by the booking page (server component).
 */
export async function getPublicHomepageData(
  tenantId: string
): Promise<HomepageData> {
  const supabase = createServiceRoleClient();

  const [hpResult, galleryResult, testimonialResult] = await Promise.all([
    supabase
      .from("tenant_homepage" as never)
      .select("*" as never)
      .eq("tenant_id" as never, tenantId)
      .maybeSingle(),
    supabase
      .from("tenant_gallery_images" as never)
      .select("id, image_url, alt_text, caption, sort_order" as never)
      .eq("tenant_id" as never, tenantId)
      .order("sort_order" as never, { ascending: true })
      .limit(HOMEPAGE_LIMITS.maxGalleryImages),
    supabase
      .from("tenant_testimonials" as never)
      .select("id, author_name, rating, body, avatar_url, sort_order" as never)
      .eq("tenant_id" as never, tenantId)
      .order("sort_order" as never, { ascending: true })
      .limit(HOMEPAGE_LIMITS.maxTestimonials),
  ]);

  const hp = (hpResult.data as unknown as Record<string, unknown>) ?? {};

  const content: HomepageContent = {
    heroTitle: (hp.hero_title as string) ?? null,
    heroSubtitle: (hp.hero_subtitle as string) ?? null,
    heroCtaLabel: (hp.hero_cta_label as string) || "Book Now",
    heroCtaTarget: (hp.hero_cta_target as CtaTarget) || "services",
    aboutTitle: (hp.about_title as string) ?? null,
    aboutBody: (hp.about_body as string) ?? null,
    aboutImageUrl: (hp.about_image_url as string) ?? null,
    sectionOrder: Array.isArray(hp.section_order)
      ? (hp.section_order as HomepageSectionId[])
      : DEFAULT_HOMEPAGE_CONTENT.sectionOrder,
    sectionVisibility: hp.section_visibility && typeof hp.section_visibility === "object"
      ? (hp.section_visibility as Record<HomepageSectionId, boolean>)
      : DEFAULT_HOMEPAGE_CONTENT.sectionVisibility,
  };

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

  return { content, gallery, testimonials };
}
