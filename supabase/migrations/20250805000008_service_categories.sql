-- Migration: Service Categories
-- Tenant-scoped organizational categories for future bookable services.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- Constraints
ALTER TABLE public.service_categories
  ADD CONSTRAINT sc_name_nonempty CHECK (char_length(trim(name)) >= 2),
  ADD CONSTRAINT sc_name_max_length CHECK (char_length(name) <= 120),
  ADD CONSTRAINT sc_slug_format CHECK (
    slug ~ '^[a-z][a-z0-9-]*[a-z0-9]$'
    AND char_length(slug) BETWEEN 2 AND 63
    AND slug NOT LIKE '%---%'
  ),
  ADD CONSTRAINT sc_description_max CHECK (description IS NULL OR char_length(description) <= 1000),
  ADD CONSTRAINT sc_sort_order_positive CHECK (sort_order >= 0);

-- Indexes
CREATE INDEX idx_service_categories_tenant ON public.service_categories (tenant_id);
CREATE INDEX idx_service_categories_tenant_active ON public.service_categories (tenant_id, is_active);

-- Updated-at trigger
CREATE TRIGGER trg_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.service_categories IS 'Tenant-scoped service categories for organizing bookable services.';

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select_member"
  ON public.service_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_categories.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "sc_insert_owner_admin"
  ON public.service_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_categories.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sc_update_owner_admin"
  ON public.service_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_categories.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sc_delete_owner_admin"
  ON public.service_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_categories.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 3. Reorder RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reorder_service_categories(
  target_tenant_id uuid,
  ordered_category_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  cat_id uuid;
  cat_tenant uuid;
BEGIN
  -- Verify owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  IF array_length(ordered_category_ids, 1) IS NULL OR array_length(ordered_category_ids, 1) = 0 THEN
    RETURN true;
  END IF;

  -- Verify all IDs belong to the tenant
  FOR i IN 1..array_length(ordered_category_ids, 1) LOOP
    cat_id := ordered_category_ids[i];

    SELECT sc.tenant_id INTO cat_tenant
    FROM public.service_categories sc
    WHERE sc.id = cat_id;

    IF cat_tenant IS NULL OR cat_tenant != target_tenant_id THEN
      RAISE EXCEPTION 'Category not found or does not belong to this business';
    END IF;

    UPDATE public.service_categories SET sort_order = i - 1 WHERE id = cat_id;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_service_categories(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_service_categories(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_service_categories(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.reorder_service_categories(uuid, uuid[]) IS
  'Atomically reorders service categories for a tenant. Verifies owner/admin role and tenant ownership.';
