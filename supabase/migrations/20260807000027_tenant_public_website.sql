-- Migration: Tenant Public Website Configuration — Milestone 15.13
--
-- Structured public site settings with draft/published lifecycle.
-- Follows the same pattern as tenant_branding_settings (14.4).
--
-- Also adds public data access RPCs for anonymous site rendering:
-- services, locations, staff, reviews, media gallery.

-- ============================================================
-- 1. Tenant Public Site Settings
-- ============================================================

CREATE TABLE public.tenant_public_site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Draft config (edited by tenant, NOT visible publicly)
  draft_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_version INTEGER NOT NULL DEFAULT 1,

  -- Published config (visible to anonymous public)
  published_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_version INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NULL,
  published_by UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tpss_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT tpss_draft_config_object CHECK (jsonb_typeof(draft_config) = 'object'),
  CONSTRAINT tpss_published_config_object CHECK (jsonb_typeof(published_config) = 'object'),
  CONSTRAINT tpss_draft_version_positive CHECK (draft_version > 0),
  CONSTRAINT tpss_published_version_non_negative CHECK (published_version >= 0)
);

COMMENT ON TABLE public.tenant_public_site_settings IS
  'Tenant public website configuration with draft/published lifecycle. Milestone 15.13.';

CREATE INDEX idx_tpss_tenant ON public.tenant_public_site_settings (tenant_id);

CREATE TRIGGER trg_tpss_updated_at
  BEFORE UPDATE ON public.tenant_public_site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. RLS for tenant_public_site_settings
-- ============================================================

ALTER TABLE public.tenant_public_site_settings ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own site settings (draft + published)
CREATE POLICY "tpss_select_member"
  ON public.tenant_public_site_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_site_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Owner/admin can insert site settings
CREATE POLICY "tpss_insert_owner_admin"
  ON public.tenant_public_site_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_site_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Owner/admin can update site settings
CREATE POLICY "tpss_update_owner_admin"
  ON public.tenant_public_site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_site_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 3. Published Site Config Resolver RPC (anonymous-safe)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_published_site_config(
  p_tenant_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_config JSONB;
BEGIN
  -- Resolve tenant (active/trialing only)
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = p_tenant_slug
    AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Get published config only
  SELECT published_config INTO v_config
  FROM tenant_public_site_settings
  WHERE tenant_id = v_tenant_id;

  IF v_config IS NULL OR v_config = '{}'::jsonb THEN
    RETURN jsonb_build_object('status', 'default');
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'config', v_config);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_site_config(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_published_site_config(TEXT) TO authenticated;

-- ============================================================
-- 4. Publish Site Config RPC (version-checked atomic publish)
-- ============================================================

CREATE OR REPLACE FUNCTION public.publish_site_config(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_expected_draft_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  -- Verify actor is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = p_actor_user_id
      AND status = 'active'
      AND role IN ('owner', 'admin')
  ) THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  -- Lock and load
  SELECT * INTO v_row
  FROM tenant_public_site_settings
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Version check (prevents stale publish)
  IF v_row.draft_version != p_expected_draft_version THEN
    RETURN jsonb_build_object('status', 'version_conflict',
      'current_draft_version', v_row.draft_version,
      'expected', p_expected_draft_version);
  END IF;

  -- Atomically copy draft → published
  UPDATE tenant_public_site_settings
  SET published_config = draft_config,
      published_version = draft_version,
      published_at = now(),
      published_by = p_actor_user_id
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object('status', 'published', 'version', v_row.draft_version);
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_site_config(UUID, UUID, INTEGER) TO authenticated;

-- ============================================================
-- 5. Public Data Access RPCs (anonymous-safe)
-- ============================================================

-- 5a. Public services for a tenant
CREATE OR REPLACE FUNCTION public.get_public_services(
  p_tenant_slug TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants WHERE slug = p_tenant_slug AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(s)::jsonb ORDER BY s.sort_order, s.name), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      sv.id, sv.name, sv.slug, sv.description,
      sv.duration_minutes, sv.price, sv.currency,
      sv.sort_order,
      sc.id AS category_id, sc.name AS category_name, sc.slug AS category_slug
    FROM services sv
    LEFT JOIN service_categories sc ON sc.id = sv.service_category_id AND sc.tenant_id = v_tenant_id AND sc.is_active = true
    WHERE sv.tenant_id = v_tenant_id AND sv.is_active = true
    ORDER BY sv.sort_order, sv.name
    LIMIT LEAST(p_limit, 100)
  ) s;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_services(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_services(TEXT, INTEGER) TO authenticated;

-- 5b. Public locations for a tenant
CREATE OR REPLACE FUNCTION public.get_public_locations(
  p_tenant_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants WHERE slug = p_tenant_slug AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(l)::jsonb ORDER BY l.sort_order, l.name), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      loc.id, loc.name, loc.slug, loc.description,
      loc.street_address, loc.city, loc.province_state,
      loc.postal_code, loc.country,
      loc.latitude, loc.longitude,
      loc.phone_number, loc.email,
      loc.timezone, loc.is_primary, loc.sort_order
    FROM locations loc
    WHERE loc.tenant_id = v_tenant_id AND loc.is_active = true
    ORDER BY loc.sort_order, loc.name
  ) l;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_locations(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_locations(TEXT) TO authenticated;

-- 5c. Public staff profiles for a tenant
CREATE OR REPLACE FUNCTION public.get_public_staff(
  p_tenant_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants WHERE slug = p_tenant_slug AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(sp)::jsonb), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      s.id, s.display_name, s.job_title, s.bio, s.avatar_url,
      s.resource_id
    FROM staff_profiles s
    WHERE s.tenant_id = v_tenant_id
      AND s.is_active = true
      AND s.is_public = true
    ORDER BY s.display_name
  ) sp;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_staff(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_staff(TEXT) TO authenticated;

-- 5d. Public reviews for a tenant
CREATE OR REPLACE FUNCTION public.get_public_reviews(
  p_tenant_slug TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants WHERE slug = p_tenant_slug AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('reviews', '[]'::jsonb, 'summary', NULL);
  END IF;

  -- Check if public reviews are enabled
  IF NOT EXISTS (
    SELECT 1 FROM tenant_notification_settings
    WHERE tenant_id = v_tenant_id AND show_public_reviews = true
  ) THEN
    RETURN jsonb_build_object('reviews', '[]'::jsonb, 'summary', NULL);
  END IF;

  -- Get reviews
  SELECT jsonb_build_object(
    'reviews', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::jsonb ORDER BY r.submitted_at DESC)
      FROM (
        SELECT
          cr.id, cr.rating, cr.comment,
          cr.customer_name_snapshot AS reviewer_name,
          cr.service_name_snapshot AS service_name,
          cr.business_response,
          cr.responded_at,
          cr.is_featured,
          cr.submitted_at
        FROM customer_reviews cr
        WHERE cr.tenant_id = v_tenant_id AND cr.status = 'published'
        ORDER BY cr.is_featured DESC, cr.submitted_at DESC
        LIMIT LEAST(p_limit, 50)
      ) r
    ), '[]'::jsonb),
    'summary', (
      SELECT jsonb_build_object(
        'count', COUNT(*),
        'average_rating', ROUND(AVG(rating)::numeric, 1),
        'rating_distribution', jsonb_build_object(
          '5', COUNT(*) FILTER (WHERE rating = 5),
          '4', COUNT(*) FILTER (WHERE rating = 4),
          '3', COUNT(*) FILTER (WHERE rating = 3),
          '2', COUNT(*) FILTER (WHERE rating = 2),
          '1', COUNT(*) FILTER (WHERE rating = 1)
        )
      )
      FROM customer_reviews
      WHERE tenant_id = v_tenant_id AND status = 'published'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_reviews(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_reviews(TEXT, INTEGER) TO authenticated;

-- 5e. Public gallery media for a tenant
CREATE OR REPLACE FUNCTION public.get_public_gallery(
  p_tenant_slug TEXT,
  p_limit INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants WHERE slug = p_tenant_slug AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.sort_order, m.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      ma.id,
      ma.storage_bucket || '/' || ma.storage_path AS path,
      ma.alt_text, ma.caption,
      ma.width, ma.height,
      ma.sort_order
    FROM media_assets ma
    WHERE ma.tenant_id = v_tenant_id
      AND ma.media_role = 'gallery'
      AND ma.location_id IS NULL
      AND ma.resource_id IS NULL
    ORDER BY ma.sort_order, ma.created_at DESC
    LIMIT LEAST(p_limit, 48)
  ) m;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_gallery(TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_gallery(TEXT, INTEGER) TO authenticated;

-- 5f. Public location working hours
CREATE OR REPLACE FUNCTION public.get_public_location_hours(
  p_tenant_slug TEXT,
  p_location_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants WHERE slug = p_tenant_slug AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Verify location belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM locations
    WHERE id = p_location_id AND tenant_id = v_tenant_id AND is_active = true
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(h)::jsonb ORDER BY h.day_of_week), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      lwh.day_of_week, lwh.is_closed,
      lwh.opens_at, lwh.closes_at
    FROM location_working_hours lwh
    WHERE lwh.location_id = p_location_id
    ORDER BY lwh.day_of_week
  ) h;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_location_hours(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_location_hours(TEXT, UUID) TO authenticated;
