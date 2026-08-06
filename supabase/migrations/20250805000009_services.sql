-- Migration: Services Foundation
-- Core service entity for the scheduling application.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_category_id uuid NULL REFERENCES public.service_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  duration_minutes integer NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- Constraints
ALTER TABLE public.services
  ADD CONSTRAINT svc_name_nonempty CHECK (char_length(trim(name)) >= 2),
  ADD CONSTRAINT svc_name_max_length CHECK (char_length(name) <= 120),
  ADD CONSTRAINT svc_slug_format CHECK (
    slug ~ '^[a-z][a-z0-9-]*[a-z0-9]$'
    AND char_length(slug) BETWEEN 2 AND 63
    AND slug NOT LIKE '%---%'
  ),
  ADD CONSTRAINT svc_description_max CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT svc_duration_range CHECK (duration_minutes BETWEEN 5 AND 1440),
  ADD CONSTRAINT svc_price_non_negative CHECK (price >= 0),
  ADD CONSTRAINT svc_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT svc_buffer_before_range CHECK (buffer_before_minutes BETWEEN 0 AND 1440),
  ADD CONSTRAINT svc_buffer_after_range CHECK (buffer_after_minutes BETWEEN 0 AND 1440),
  ADD CONSTRAINT svc_sort_order_positive CHECK (sort_order >= 0);

-- Category must belong to the same tenant
-- Enforced via trigger since cross-table CHECK constraints are not supported
CREATE OR REPLACE FUNCTION public.verify_service_category_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.service_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.service_categories sc
      WHERE sc.id = NEW.service_category_id
        AND sc.tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Service category does not belong to this tenant';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_service_category_tenant
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.verify_service_category_tenant();

-- Indexes
CREATE INDEX idx_services_tenant ON public.services (tenant_id);
CREATE INDEX idx_services_category ON public.services (service_category_id);
CREATE INDEX idx_services_tenant_active ON public.services (tenant_id, is_active);
CREATE INDEX idx_services_tenant_category_sort ON public.services (tenant_id, service_category_id, sort_order);

-- Updated-at trigger
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.services IS 'Bookable services offered by a business.';

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svc_select_member"
  ON public.services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = services.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "svc_insert_owner_admin"
  ON public.services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = services.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "svc_update_owner_admin"
  ON public.services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = services.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "svc_delete_owner_admin"
  ON public.services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = services.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 3. Reorder RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reorder_services(
  target_tenant_id uuid,
  target_category_id uuid,
  ordered_service_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  svc_id uuid;
  svc_tenant uuid;
  svc_category uuid;
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

  IF array_length(ordered_service_ids, 1) IS NULL OR array_length(ordered_service_ids, 1) = 0 THEN
    RETURN true;
  END IF;

  -- Verify all services belong to the tenant and requested category
  FOR i IN 1..array_length(ordered_service_ids, 1) LOOP
    svc_id := ordered_service_ids[i];

    SELECT s.tenant_id, s.service_category_id INTO svc_tenant, svc_category
    FROM public.services s
    WHERE s.id = svc_id;

    IF svc_tenant IS NULL OR svc_tenant != target_tenant_id THEN
      RAISE EXCEPTION 'Service not found or does not belong to this business';
    END IF;

    -- Check category scope (NULL = uncategorized)
    IF target_category_id IS NULL THEN
      IF svc_category IS NOT NULL THEN
        RAISE EXCEPTION 'Service does not belong to the uncategorized scope';
      END IF;
    ELSE
      IF svc_category IS DISTINCT FROM target_category_id THEN
        RAISE EXCEPTION 'Service does not belong to the requested category';
      END IF;
    END IF;

    UPDATE public.services SET sort_order = i - 1 WHERE id = svc_id;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_services(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_services(uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_services(uuid, uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.reorder_services(uuid, uuid, uuid[]) IS
  'Atomically reorders services within a category scope. Verifies owner/admin role, tenant ownership, and category membership.';
