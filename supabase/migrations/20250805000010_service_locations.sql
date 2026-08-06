-- Migration: Service Locations
-- Junction table assigning services to business locations.
-- Includes tenant-consistency trigger, RLS policies, and atomic sync RPCs.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.service_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: a service may only be assigned once to a specific location within a tenant
ALTER TABLE public.service_locations
  ADD CONSTRAINT uq_service_locations_tenant_service_location
    UNIQUE (tenant_id, service_id, location_id);

-- Sort order must be non-negative
ALTER TABLE public.service_locations
  ADD CONSTRAINT sl_sort_order_non_negative CHECK (sort_order >= 0);

COMMENT ON TABLE public.service_locations IS
  'Assigns services to locations. A service being assigned to a location means only that the service may be offered there.';

-- ============================================================
-- 2. Tenant-Consistency Trigger
-- Validates that both service_id and location_id belong to the
-- same tenant_id as the assignment row. Runs on INSERT and UPDATE
-- to prevent cross-tenant assignments even when RLS is bypassed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_service_location_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify service belongs to the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id
      AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to this tenant';
  END IF;

  -- Verify location belongs to the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = NEW.location_id
      AND l.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Location does not belong to this tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_service_location_tenant
  BEFORE INSERT OR UPDATE ON public.service_locations
  FOR EACH ROW EXECUTE FUNCTION public.verify_service_location_tenant();

-- ============================================================
-- 3. Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_service_locations_updated_at
  BEFORE UPDATE ON public.service_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Indexes
-- ============================================================

CREATE INDEX idx_service_locations_tenant ON public.service_locations (tenant_id);
CREATE INDEX idx_service_locations_service ON public.service_locations (service_id);
CREATE INDEX idx_service_locations_location ON public.service_locations (location_id);
CREATE INDEX idx_service_locations_tenant_service ON public.service_locations (tenant_id, service_id);
CREATE INDEX idx_service_locations_tenant_location ON public.service_locations (tenant_id, location_id);
CREATE INDEX idx_service_locations_tenant_active ON public.service_locations (tenant_id, is_active);
CREATE INDEX idx_service_locations_tenant_location_sort ON public.service_locations (tenant_id, location_id, sort_order);

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant members can view assignments
CREATE POLICY "sl_select_member"
  ON public.service_locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- INSERT: only owner/admin can create assignments
CREATE POLICY "sl_insert_owner_admin"
  ON public.service_locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: only owner/admin can modify assignments
CREATE POLICY "sl_update_owner_admin"
  ON public.service_locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- DELETE: only owner/admin can remove assignments
CREATE POLICY "sl_delete_owner_admin"
  ON public.service_locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 6. set_service_locations RPC
-- Atomically replaces the location set for a single service.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_service_locations(
  p_tenant_id uuid,
  p_service_id uuid,
  p_location_ids uuid[]
)
RETURNS SETOF public.service_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  loc_id uuid;
  dup_check uuid[];
BEGIN
  -- 1. Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- 2. Verify service belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = p_service_id
      AND s.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Service not found in this business';
  END IF;

  -- 3. Handle NULL or empty array: remove all assignments
  IF p_location_ids IS NULL OR array_length(p_location_ids, 1) IS NULL THEN
    DELETE FROM public.service_locations
    WHERE service_id = p_service_id AND tenant_id = p_tenant_id;

    RETURN QUERY
      SELECT * FROM public.service_locations WHERE false;
    RETURN;
  END IF;

  -- 4. Reject duplicate location IDs
  SELECT array_agg(DISTINCT lid) INTO dup_check FROM unnest(p_location_ids) AS lid;
  IF array_length(dup_check, 1) != array_length(p_location_ids, 1) THEN
    RAISE EXCEPTION 'Duplicate location IDs are not allowed';
  END IF;

  -- 5. Verify all locations belong to the tenant
  IF EXISTS (
    SELECT 1 FROM unnest(p_location_ids) AS lid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = lid AND l.tenant_id = p_tenant_id
    )
  ) THEN
    RAISE EXCEPTION 'One or more locations do not belong to this business';
  END IF;

  -- 6. Remove assignments no longer in the set
  DELETE FROM public.service_locations
  WHERE service_id = p_service_id
    AND tenant_id = p_tenant_id
    AND location_id != ALL(p_location_ids);

  -- 7. Insert missing assignments (preserving existing ones)
  INSERT INTO public.service_locations (tenant_id, service_id, location_id, is_active, sort_order)
  SELECT p_tenant_id, p_service_id, lid, true, 0
  FROM unnest(p_location_ids) AS lid
  WHERE NOT EXISTS (
    SELECT 1 FROM public.service_locations sl
    WHERE sl.service_id = p_service_id
      AND sl.location_id = lid
      AND sl.tenant_id = p_tenant_id
  );

  -- 8. Return the final assignment set
  RETURN QUERY
    SELECT * FROM public.service_locations
    WHERE service_id = p_service_id
      AND tenant_id = p_tenant_id
    ORDER BY sort_order, created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_service_locations(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_service_locations(uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_service_locations(uuid, uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.set_service_locations(uuid, uuid, uuid[]) IS
  'Atomically replaces the set of locations assigned to a service. Verifies ownership, tenant consistency, and rejects duplicates.';

-- ============================================================
-- 7. reorder_service_locations RPC
-- Atomically reorders service assignments within a location.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reorder_service_locations(
  p_tenant_id uuid,
  p_location_id uuid,
  p_ordered_assignment_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  asg_id uuid;
  asg_tenant uuid;
  asg_location uuid;
  existing_count integer;
  dup_check uuid[];
BEGIN
  -- 1. Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- 2. Verify location belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = p_location_id AND l.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Location not found in this business';
  END IF;

  -- 3. Handle empty array
  IF p_ordered_assignment_ids IS NULL OR array_length(p_ordered_assignment_ids, 1) IS NULL THEN
    RETURN true;
  END IF;

  -- 4. Reject duplicates
  SELECT array_agg(DISTINCT aid) INTO dup_check FROM unnest(p_ordered_assignment_ids) AS aid;
  IF array_length(dup_check, 1) != array_length(p_ordered_assignment_ids, 1) THEN
    RAISE EXCEPTION 'Duplicate assignment IDs are not allowed';
  END IF;

  -- 5. Verify completeness: must include all assignments for this location
  SELECT count(*) INTO existing_count
  FROM public.service_locations
  WHERE tenant_id = p_tenant_id AND location_id = p_location_id;

  IF existing_count != array_length(p_ordered_assignment_ids, 1) THEN
    RAISE EXCEPTION 'Must include all assignments for this location (expected %, got %)',
      existing_count, array_length(p_ordered_assignment_ids, 1);
  END IF;

  -- 6. Verify each assignment belongs to the tenant and location, then update
  FOR i IN 1..array_length(p_ordered_assignment_ids, 1) LOOP
    asg_id := p_ordered_assignment_ids[i];

    SELECT sl.tenant_id, sl.location_id INTO asg_tenant, asg_location
    FROM public.service_locations sl
    WHERE sl.id = asg_id;

    IF asg_tenant IS NULL OR asg_tenant != p_tenant_id THEN
      RAISE EXCEPTION 'Assignment not found or does not belong to this business';
    END IF;

    IF asg_location != p_location_id THEN
      RAISE EXCEPTION 'Assignment does not belong to the specified location';
    END IF;

    UPDATE public.service_locations SET sort_order = i - 1 WHERE id = asg_id;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_service_locations(uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_service_locations(uuid, uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_service_locations(uuid, uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.reorder_service_locations(uuid, uuid, uuid[]) IS
  'Atomically reorders service-location assignments within a location. Verifies ownership, completeness, and prevents mixed-location ordering.';
