-- Migration: Resource Foundation
-- Creates resource_types, resources, resource_locations tables with
-- constraints, indexes, RLS policies, triggers, and RPCs.

-- ============================================================
-- 1. resource_types table
-- ============================================================

CREATE TABLE public.resource_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  resource_kind text NOT NULL,
  display_name_singular text NOT NULL,
  display_name_plural text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE public.resource_types
  ADD CONSTRAINT rt_name_nonempty CHECK (char_length(trim(name)) >= 1),
  ADD CONSTRAINT rt_name_max_length CHECK (char_length(name) <= 120),
  ADD CONSTRAINT rt_slug_format CHECK (slug ~ '^[a-z][a-z0-9-]*[a-z0-9]$' AND char_length(slug) BETWEEN 2 AND 63 AND slug NOT LIKE '%---%'),
  ADD CONSTRAINT rt_description_max CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT rt_kind_check CHECK (resource_kind IN ('person', 'room', 'equipment', 'vehicle', 'other')),
  ADD CONSTRAINT rt_singular_nonempty CHECK (char_length(trim(display_name_singular)) >= 1),
  ADD CONSTRAINT rt_singular_max CHECK (char_length(display_name_singular) <= 120),
  ADD CONSTRAINT rt_plural_nonempty CHECK (char_length(trim(display_name_plural)) >= 1),
  ADD CONSTRAINT rt_plural_max CHECK (char_length(display_name_plural) <= 120);

CREATE TRIGGER trg_resource_types_updated_at
  BEFORE UPDATE ON public.resource_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.resource_types IS 'Tenant-scoped resource type definitions (e.g. Barber, Room, Court).';

-- ============================================================
-- 2. resources table
-- ============================================================

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_type_id uuid NOT NULL REFERENCES public.resource_types(id),
  name text NOT NULL,
  slug text NOT NULL,
  description text NULL,
  email text NULL,
  phone_number text NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE public.resources
  ADD CONSTRAINT res_name_nonempty CHECK (char_length(trim(name)) >= 1),
  ADD CONSTRAINT res_name_max_length CHECK (char_length(name) <= 120),
  ADD CONSTRAINT res_slug_format CHECK (slug ~ '^[a-z][a-z0-9-]*[a-z0-9]$' AND char_length(slug) BETWEEN 2 AND 63 AND slug NOT LIKE '%---%'),
  ADD CONSTRAINT res_description_max CHECK (description IS NULL OR char_length(description) <= 2000);

CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.resources IS 'Schedulable resources (people, rooms, equipment, etc).';

-- ============================================================
-- 3. resource_locations table
-- ============================================================

CREATE TABLE public.resource_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, location_id)
);

-- Partial unique index: at most one primary per resource
CREATE UNIQUE INDEX idx_resource_locations_primary
  ON public.resource_locations (resource_id)
  WHERE is_primary = true;

CREATE TRIGGER trg_resource_locations_updated_at
  BEFORE UPDATE ON public.resource_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.resource_locations IS 'Assigns resources to locations. A resource may belong to multiple locations.';

-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- resource_types
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rt_select_member" ON public.resource_types FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_types.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "rt_insert_owner_admin" ON public.resource_types FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_types.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "rt_update_owner_admin" ON public.resource_types FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_types.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "rt_delete_owner_admin" ON public.resource_types FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_types.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

-- resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "res_select_member" ON public.resources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resources.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "res_insert_owner_admin" ON public.resources FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resources.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "res_update_owner_admin" ON public.resources FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resources.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "res_delete_owner_admin" ON public.resources FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resources.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

-- resource_locations
ALTER TABLE public.resource_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rl_select_member" ON public.resource_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_locations.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "rl_insert_owner_admin" ON public.resource_locations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_locations.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "rl_update_owner_admin" ON public.resource_locations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_locations.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "rl_delete_owner_admin" ON public.resource_locations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = resource_locations.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

-- ============================================================
-- 5. RPCs
-- ============================================================

-- Create resource with location assignments atomically
CREATE OR REPLACE FUNCTION public.create_resource_with_locations(
  p_tenant_id uuid,
  p_resource_type_id uuid,
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_location_ids uuid[] DEFAULT '{}',
  p_primary_location_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_resource_id uuid;
  loc_id uuid;
BEGIN
  -- Verify owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify resource type belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resource_types rt
    WHERE rt.id = p_resource_type_id AND rt.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource type not found in this business';
  END IF;

  -- Verify all locations belong to tenant
  IF array_length(p_location_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM unnest(p_location_ids) AS lid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.locations l WHERE l.id = lid AND l.tenant_id = p_tenant_id
      )
    ) THEN
      RAISE EXCEPTION 'One or more locations do not belong to this business';
    END IF;
  END IF;

  -- Insert resource
  INSERT INTO public.resources (tenant_id, resource_type_id, name, slug, description, email, phone_number, is_active)
  VALUES (p_tenant_id, p_resource_type_id, trim(p_name), lower(trim(p_slug)),
          CASE WHEN trim(COALESCE(p_description, '')) = '' THEN NULL ELSE trim(p_description) END,
          CASE WHEN trim(COALESCE(p_email, '')) = '' THEN NULL ELSE trim(p_email) END,
          CASE WHEN trim(COALESCE(p_phone_number, '')) = '' THEN NULL ELSE trim(p_phone_number) END,
          p_is_active)
  RETURNING id INTO new_resource_id;

  -- Insert location assignments
  IF array_length(p_location_ids, 1) > 0 THEN
    FOREACH loc_id IN ARRAY p_location_ids LOOP
      INSERT INTO public.resource_locations (tenant_id, resource_id, location_id, is_primary, is_active)
      VALUES (p_tenant_id, new_resource_id, loc_id,
              (loc_id = COALESCE(p_primary_location_id, p_location_ids[1])),
              true);
    END LOOP;
  END IF;

  RETURN new_resource_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_resource_with_locations(uuid, uuid, text, text, text, text, text, boolean, uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_resource_with_locations(uuid, uuid, text, text, text, text, text, boolean, uuid[], uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_resource_with_locations(uuid, uuid, text, text, text, text, text, boolean, uuid[], uuid) TO authenticated;

-- Set primary resource location
CREATE OR REPLACE FUNCTION public.set_primary_resource_location(
  p_tenant_id uuid,
  p_resource_id uuid,
  p_location_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r WHERE r.id = p_resource_id AND r.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource not found in this business';
  END IF;

  -- Verify assignment exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.resource_locations rl
    WHERE rl.resource_id = p_resource_id AND rl.location_id = p_location_id AND rl.is_active = true
  ) THEN
    RAISE EXCEPTION 'Location assignment not found or inactive';
  END IF;

  -- Clear old primary
  UPDATE public.resource_locations SET is_primary = false
  WHERE resource_id = p_resource_id AND is_primary = true;

  -- Set new primary
  UPDATE public.resource_locations SET is_primary = true
  WHERE resource_id = p_resource_id AND location_id = p_location_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_primary_resource_location(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_primary_resource_location(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_primary_resource_location(uuid, uuid, uuid) TO authenticated;

-- Delete resource type (only if no resources use it)
CREATE OR REPLACE FUNCTION public.delete_resource_type(
  p_tenant_id uuid,
  p_resource_type_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resource_types rt WHERE rt.id = p_resource_type_id AND rt.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource type not found';
  END IF;

  -- Check no resources use it
  IF EXISTS (
    SELECT 1 FROM public.resources r WHERE r.resource_type_id = p_resource_type_id
  ) THEN
    RAISE EXCEPTION 'This resource type is currently in use';
  END IF;

  DELETE FROM public.resource_types WHERE id = p_resource_type_id AND tenant_id = p_tenant_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_resource_type(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_resource_type(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_resource_type(uuid, uuid) TO authenticated;

-- Delete resource (cascades assignments)
CREATE OR REPLACE FUNCTION public.delete_business_resource(
  p_tenant_id uuid,
  p_resource_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r WHERE r.id = p_resource_id AND r.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;

  -- Delete (resource_locations cascade)
  DELETE FROM public.resources WHERE id = p_resource_id AND tenant_id = p_tenant_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_business_resource(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_business_resource(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_business_resource(uuid, uuid) TO authenticated;
