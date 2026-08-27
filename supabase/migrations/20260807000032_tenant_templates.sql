-- Migration: Tenant Templates — Milestone 16.2
--
-- Adds a template column to tenant_branding_settings so each tenant
-- can choose a layout template for their public booking portal.
-- Default: 'minimal'. Code-driven registry — no separate template table needed.

-- ============================================================
-- 1. Add template column
-- ============================================================

ALTER TABLE public.tenant_branding_settings
  ADD COLUMN IF NOT EXISTS template TEXT NOT NULL DEFAULT 'minimal';

-- Constrain to known template IDs (update when new templates are added)
ALTER TABLE public.tenant_branding_settings
  ADD CONSTRAINT tbs_template_valid
  CHECK (template IN ('minimal', 'bold', 'elegant'));

COMMENT ON COLUMN public.tenant_branding_settings.template IS
  'Active layout template for the public booking portal. Milestone 16.2.';

-- ============================================================
-- 2. Public RPC: get tenant template by slug
-- ============================================================
-- Returns the active template for a tenant slug.
-- Safe for anonymous access (used by the public booking layout).

CREATE OR REPLACE FUNCTION public.get_tenant_template(
  p_tenant_slug TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_template TEXT;
BEGIN
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = p_tenant_slug
    AND status IN ('active', 'trialing');

  IF v_tenant_id IS NULL THEN
    RETURN 'minimal';
  END IF;

  SELECT template INTO v_template
  FROM tenant_branding_settings
  WHERE tenant_id = v_tenant_id;

  RETURN COALESCE(v_template, 'minimal');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_template(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_template(TEXT) TO authenticated;

-- ============================================================
-- 3. Authenticated RPC: update tenant template
-- ============================================================
-- Only owner/admin can change the template.

CREATE OR REPLACE FUNCTION public.update_tenant_template(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_template TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Validate template value
  IF p_template NOT IN ('minimal', 'bold', 'elegant') THEN
    RETURN jsonb_build_object('status', 'invalid_template');
  END IF;

  -- Upsert branding row with new template
  INSERT INTO tenant_branding_settings (tenant_id, template)
  VALUES (p_tenant_id, p_template)
  ON CONFLICT (tenant_id)
  DO UPDATE SET template = p_template, updated_at = now();

  RETURN jsonb_build_object('status', 'ok', 'template', p_template);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_tenant_template(UUID, UUID, TEXT) TO authenticated;
