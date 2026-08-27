-- Migration: Homepage Content Builder — Milestone 16.4
--
-- Creates tenant_homepage (hero, about, section ordering/visibility),
-- tenant_gallery_images, and tenant_testimonials tables.
-- Separates homepage content from the broader site config.

-- ============================================================
-- 1. tenant_homepage
-- ============================================================

CREATE TABLE public.tenant_homepage (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Hero
  hero_title TEXT NULL,
  hero_subtitle TEXT NULL,
  hero_cta_label TEXT NOT NULL DEFAULT 'Book Now',
  hero_cta_target TEXT NOT NULL DEFAULT 'services',

  -- About
  about_title TEXT NULL,
  about_body TEXT NULL,
  about_image_url TEXT NULL,

  -- Section config (JSONB arrays)
  section_order JSONB NOT NULL DEFAULT '["hero","about","services","staff","gallery","testimonials","cta"]'::jsonb,
  section_visibility JSONB NOT NULL DEFAULT '{"hero":true,"about":false,"services":true,"staff":true,"gallery":false,"testimonials":false,"cta":true}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT th_hero_title_len CHECK (hero_title IS NULL OR char_length(hero_title) <= 120),
  CONSTRAINT th_hero_subtitle_len CHECK (hero_subtitle IS NULL OR char_length(hero_subtitle) <= 250),
  CONSTRAINT th_hero_cta_label_len CHECK (char_length(hero_cta_label) <= 40),
  CONSTRAINT th_hero_cta_target_valid CHECK (hero_cta_target IN ('services', 'staff', 'locations', 'booking')),
  CONSTRAINT th_about_title_len CHECK (about_title IS NULL OR char_length(about_title) <= 120),
  CONSTRAINT th_about_body_len CHECK (about_body IS NULL OR char_length(about_body) <= 3000),
  CONSTRAINT th_about_image_url_len CHECK (about_image_url IS NULL OR char_length(about_image_url) <= 1000),
  CONSTRAINT th_section_order_array CHECK (jsonb_typeof(section_order) = 'array'),
  CONSTRAINT th_section_visibility_object CHECK (jsonb_typeof(section_visibility) = 'object')
);

COMMENT ON TABLE public.tenant_homepage IS
  'Tenant homepage content: hero, about, section ordering and visibility. Milestone 16.4.';

CREATE TRIGGER trg_tenant_homepage_updated_at
  BEFORE UPDATE ON public.tenant_homepage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. tenant_gallery_images
-- ============================================================

CREATE TABLE public.tenant_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NULL,
  caption TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tgi_image_url_len CHECK (char_length(image_url) <= 1000),
  CONSTRAINT tgi_alt_text_len CHECK (alt_text IS NULL OR char_length(alt_text) <= 250),
  CONSTRAINT tgi_caption_len CHECK (caption IS NULL OR char_length(caption) <= 500),
  CONSTRAINT tgi_sort_order_range CHECK (sort_order >= 0 AND sort_order < 100)
);

CREATE INDEX idx_tgi_tenant_order ON public.tenant_gallery_images (tenant_id, sort_order);

COMMENT ON TABLE public.tenant_gallery_images IS
  'Homepage gallery images, ordered per tenant. Milestone 16.4.';

-- ============================================================
-- 3. tenant_testimonials
-- ============================================================

CREATE TABLE public.tenant_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  body TEXT NOT NULL,
  avatar_url TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tt_author_name_len CHECK (char_length(author_name) BETWEEN 1 AND 100),
  CONSTRAINT tt_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT tt_body_len CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT tt_avatar_url_len CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 1000),
  CONSTRAINT tt_sort_order_range CHECK (sort_order >= 0 AND sort_order < 100)
);

CREATE INDEX idx_tt_tenant_order ON public.tenant_testimonials (tenant_id, sort_order);

CREATE TRIGGER trg_tenant_testimonials_updated_at
  BEFORE UPDATE ON public.tenant_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.tenant_testimonials IS
  'Manually curated testimonials for the homepage. Milestone 16.4.';

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.tenant_homepage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_testimonials ENABLE ROW LEVEL SECURITY;

-- Owner/admin can read + write homepage content
CREATE POLICY "th_select_member" ON public.tenant_homepage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_homepage.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "th_upsert_owner_admin" ON public.tenant_homepage FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_homepage.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "th_update_owner_admin" ON public.tenant_homepage FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_homepage.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

-- Gallery images — same pattern
CREATE POLICY "tgi_select_member" ON public.tenant_gallery_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_gallery_images.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "tgi_insert_owner_admin" ON public.tenant_gallery_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_gallery_images.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "tgi_update_owner_admin" ON public.tenant_gallery_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_gallery_images.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "tgi_delete_owner_admin" ON public.tenant_gallery_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_gallery_images.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

-- Testimonials — same pattern
CREATE POLICY "tt_select_member" ON public.tenant_testimonials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_testimonials.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "tt_insert_owner_admin" ON public.tenant_testimonials FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_testimonials.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "tt_update_owner_admin" ON public.tenant_testimonials FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_testimonials.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "tt_delete_owner_admin" ON public.tenant_testimonials FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = tenant_testimonials.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

-- Anonymous can read homepage, gallery, testimonials (public portal)
CREATE POLICY "th_select_anon" ON public.tenant_homepage FOR SELECT TO anon
  USING (true);

CREATE POLICY "tgi_select_anon" ON public.tenant_gallery_images FOR SELECT TO anon
  USING (true);

CREATE POLICY "tt_select_anon" ON public.tenant_testimonials FOR SELECT TO anon
  USING (true);
