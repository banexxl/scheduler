-- Migration: Tenant Branding & Public Theme System — Milestone 14.4
--
-- Creates tenant_branding_settings table with draft/published JSONB config,
-- versioning, and safe RLS policies.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.tenant_branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Draft config (edited by tenant, NOT visible publicly)
  draft_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  draft_version INTEGER NOT NULL DEFAULT 1,

  -- Published config (visible to public/anonymous)
  published_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_version INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tbs_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT tbs_draft_config_object CHECK (jsonb_typeof(draft_config) = 'object'),
  CONSTRAINT tbs_published_config_object CHECK (jsonb_typeof(published_config) = 'object'),
  CONSTRAINT tbs_draft_version_positive CHECK (draft_version > 0),
  CONSTRAINT tbs_published_version_non_negative CHECK (published_version >= 0)
);

COMMENT ON TABLE public.tenant_branding_settings IS
  'Tenant-controlled branding with draft/published lifecycle. Milestone 14.4.';

CREATE INDEX idx_tbs_tenant ON public.tenant_branding_settings (tenant_id);

CREATE TRIGGER trg_tbs_updated_at
  BEFORE UPDATE ON public.tenant_branding_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.tenant_branding_settings ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own branding (draft + published)
CREATE POLICY "tbs_select_member"
  ON public.tenant_branding_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_branding_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Owner/admin can insert/update branding
CREATE POLICY "tbs_insert_owner_admin"
  ON public.tenant_branding_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_branding_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tbs_update_owner_admin"
  ON public.tenant_branding_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_branding_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Anonymous/public can read ONLY published config (not draft)
-- This is handled via the RPC below, not direct table access.

-- ============================================================
-- 3. Public Branding Resolver RPC
-- ============================================================
-- Returns ONLY published config for a given tenant slug.
-- Safe for anonymous access.

CREATE OR REPLACE FUNCTION public.get_published_tenant_branding(
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
  -- Resolve tenant
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = p_tenant_slug
    AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Get published config
  SELECT published_config INTO v_config
  FROM tenant_branding_settings
  WHERE tenant_id = v_tenant_id;

  IF v_config IS NULL OR v_config = '{}'::jsonb THEN
    RETURN jsonb_build_object('status', 'default');
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'config', v_config);
END;
$$;

-- Grant to anon + authenticated (public booking needs it)
GRANT EXECUTE ON FUNCTION public.get_published_tenant_branding(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_published_tenant_branding(TEXT) TO authenticated;

-- ============================================================
-- 4. Publish Branding RPC
-- ============================================================
-- Atomically copies draft → published with version check.

CREATE OR REPLACE FUNCTION public.publish_tenant_branding(
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
  FROM tenant_branding_settings
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Version check
  IF v_row.draft_version != p_expected_draft_version THEN
    RETURN jsonb_build_object('status', 'version_conflict',
      'current_draft_version', v_row.draft_version,
      'expected', p_expected_draft_version);
  END IF;

  -- Publish: copy draft → published
  UPDATE tenant_branding_settings
  SET published_config = draft_config,
      published_version = draft_version,
      published_at = now()
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object('status', 'published', 'version', v_row.draft_version);
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_tenant_branding(UUID, UUID, INTEGER) TO authenticated;
