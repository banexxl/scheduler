-- Migration: Resource Schedules
-- Introduces resource_working_hours and resource_time_off tables
-- for defining when resources normally work and when they are unavailable.

-- ============================================================
-- PART A: Resource Working Hours
-- ============================================================

-- 1. Table
-- ============================================================

CREATE TABLE public.resource_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  location_id uuid NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.resource_working_hours
  ADD CONSTRAINT rwh_day_of_week_range CHECK (day_of_week BETWEEN 1 AND 7),
  ADD CONSTRAINT rwh_start_before_end CHECK (start_time < end_time),
  ADD CONSTRAINT rwh_sort_order_non_negative CHECK (sort_order >= 0);

COMMENT ON TABLE public.resource_working_hours IS
  'Recurring weekly working periods for resources. Day convention: 1=Mon, 2=Tue, ..., 7=Sun. Times in tenant-local wall clock.';

-- 2. Tenant-Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_resource_working_hour_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = NEW.resource_id AND r.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to this tenant';
  END IF;

  -- Verify location belongs to tenant (when supplied)
  IF NEW.location_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = NEW.location_id AND l.tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Location does not belong to this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_resource_working_hour_tenant
  BEFORE INSERT OR UPDATE ON public.resource_working_hours
  FOR EACH ROW EXECUTE FUNCTION public.verify_resource_working_hour_tenant();

-- 3. Overlap Prevention Trigger
-- Uses a trigger because exclusion constraints cannot cleanly handle
-- nullable location_id + is_active filtering.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_resource_working_hour_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check active rows
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping active periods for same resource, day, and location scope
  IF EXISTS (
    SELECT 1 FROM public.resource_working_hours rwh
    WHERE rwh.id != NEW.id
      AND rwh.tenant_id = NEW.tenant_id
      AND rwh.resource_id = NEW.resource_id
      AND rwh.day_of_week = NEW.day_of_week
      AND rwh.is_active = true
      AND (
        (NEW.location_id IS NULL AND rwh.location_id IS NULL)
        OR (NEW.location_id IS NOT NULL AND rwh.location_id = NEW.location_id)
      )
      AND NEW.start_time < rwh.end_time
      AND NEW.end_time > rwh.start_time
  ) THEN
    RAISE EXCEPTION 'Working period overlaps with an existing active period for this resource and day';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_resource_working_hour_overlap
  BEFORE INSERT OR UPDATE ON public.resource_working_hours
  FOR EACH ROW EXECUTE FUNCTION public.check_resource_working_hour_overlap();

-- 4. Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_resource_working_hours_updated_at
  BEFORE UPDATE ON public.resource_working_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Indexes
-- ============================================================

CREATE INDEX idx_rwh_tenant ON public.resource_working_hours (tenant_id);
CREATE INDEX idx_rwh_resource ON public.resource_working_hours (resource_id);
CREATE INDEX idx_rwh_location ON public.resource_working_hours (location_id);
CREATE INDEX idx_rwh_tenant_resource ON public.resource_working_hours (tenant_id, resource_id);
CREATE INDEX idx_rwh_tenant_resource_day ON public.resource_working_hours (tenant_id, resource_id, day_of_week);
CREATE INDEX idx_rwh_tenant_location_day ON public.resource_working_hours (tenant_id, location_id, day_of_week);
CREATE INDEX idx_rwh_tenant_resource_active ON public.resource_working_hours (tenant_id, resource_id, is_active);
CREATE INDEX idx_rwh_resource_day_start ON public.resource_working_hours (resource_id, day_of_week, start_time);

-- 6. RLS Policies
-- ============================================================

ALTER TABLE public.resource_working_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rwh_select_member"
  ON public.resource_working_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_working_hours.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "rwh_insert_owner_admin"
  ON public.resource_working_hours FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_working_hours.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "rwh_update_owner_admin"
  ON public.resource_working_hours FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_working_hours.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "rwh_delete_owner_admin"
  ON public.resource_working_hours FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_working_hours.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- 7. set_resource_working_hours RPC
-- Atomically replaces the weekly schedule for a resource.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_resource_working_hours(
  p_tenant_id uuid,
  p_resource_id uuid,
  p_periods jsonb
)
RETURNS SETOF public.resource_working_hours
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  period jsonb;
  loc_id uuid;
  d_of_week smallint;
  s_time time;
  e_time time;
  loc_ids uuid[] := '{}';
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

  -- 2. Verify resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = p_resource_id AND r.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource not found in this business';
  END IF;

  -- 3. Handle NULL or empty array: clear schedule
  IF p_periods IS NULL OR jsonb_array_length(p_periods) = 0 THEN
    DELETE FROM public.resource_working_hours
    WHERE resource_id = p_resource_id AND tenant_id = p_tenant_id;

    RETURN QUERY SELECT * FROM public.resource_working_hours WHERE false;
    RETURN;
  END IF;

  -- 4. Validate all periods
  FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
    -- Day of week
    d_of_week := (period->>'day_of_week')::smallint;
    IF d_of_week IS NULL OR d_of_week NOT BETWEEN 1 AND 7 THEN
      RAISE EXCEPTION 'Invalid day_of_week: must be between 1 (Monday) and 7 (Sunday)';
    END IF;

    -- Times
    s_time := (period->>'start_time')::time;
    e_time := (period->>'end_time')::time;
    IF s_time IS NULL OR e_time IS NULL THEN
      RAISE EXCEPTION 'start_time and end_time are required';
    END IF;
    IF s_time >= e_time THEN
      RAISE EXCEPTION 'start_time must be before end_time (overnight periods not supported)';
    END IF;

    -- Location
    loc_id := (period->>'location_id')::uuid;
    IF loc_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.locations l
        WHERE l.id = loc_id AND l.tenant_id = p_tenant_id
      ) THEN
        RAISE EXCEPTION 'Location does not belong to this business';
      END IF;
    END IF;
  END LOOP;

  -- 5. Check for overlaps within the submitted set (active periods only)
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periods) a,
         jsonb_array_elements(p_periods) b
    WHERE a::text < b::text  -- avoid self-compare and double-check
      AND COALESCE((a->>'is_active')::boolean, true) = true
      AND COALESCE((b->>'is_active')::boolean, true) = true
      AND (a->>'day_of_week')::smallint = (b->>'day_of_week')::smallint
      AND (
        (a->>'location_id' IS NULL AND b->>'location_id' IS NULL)
        OR (a->>'location_id' = b->>'location_id')
      )
      AND (a->>'start_time')::time < (b->>'end_time')::time
      AND (a->>'end_time')::time > (b->>'start_time')::time
  ) THEN
    RAISE EXCEPTION 'Submitted schedule contains overlapping active periods';
  END IF;

  -- 6. Replace: delete all existing, insert new
  DELETE FROM public.resource_working_hours
  WHERE resource_id = p_resource_id AND tenant_id = p_tenant_id;

  -- 7. Insert new periods (overlap trigger validates each row)
  FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
    INSERT INTO public.resource_working_hours (
      tenant_id, resource_id, location_id, day_of_week,
      start_time, end_time, is_active, sort_order
    )
    VALUES (
      p_tenant_id,
      p_resource_id,
      (period->>'location_id')::uuid,
      (period->>'day_of_week')::smallint,
      (period->>'start_time')::time,
      (period->>'end_time')::time,
      COALESCE((period->>'is_active')::boolean, true),
      COALESCE((period->>'sort_order')::integer, 0)
    );
  END LOOP;

  -- 8. Return final schedule
  RETURN QUERY
    SELECT * FROM public.resource_working_hours
    WHERE resource_id = p_resource_id AND tenant_id = p_tenant_id
    ORDER BY day_of_week, start_time, sort_order;
END;
$$;

REVOKE ALL ON FUNCTION public.set_resource_working_hours(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_resource_working_hours(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_resource_working_hours(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.set_resource_working_hours(uuid, uuid, jsonb) IS
  'Atomically replaces the weekly working schedule for a resource. Validates days, times, locations, and overlaps.';

-- ============================================================
-- PART B: Resource Time Off
-- ============================================================

-- 8. Table
-- ============================================================

CREATE TABLE public.resource_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  location_id uuid NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  title text NULL,
  notes text NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.resource_time_off
  ADD CONSTRAINT rto_starts_before_ends CHECK (starts_at < ends_at),
  ADD CONSTRAINT rto_title_length CHECK (title IS NULL OR char_length(trim(title)) BETWEEN 1 AND 120),
  ADD CONSTRAINT rto_notes_max CHECK (notes IS NULL OR char_length(notes) <= 2000);

COMMENT ON TABLE public.resource_time_off IS
  'Date-specific time-off periods when a resource is unavailable. Uses half-open interval [starts_at, ends_at).';

-- 9. Tenant-Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_resource_time_off_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = NEW.resource_id AND r.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to this tenant';
  END IF;

  -- Verify location belongs to tenant (when supplied)
  IF NEW.location_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = NEW.location_id AND l.tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Location does not belong to this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_resource_time_off_tenant
  BEFORE INSERT OR UPDATE ON public.resource_time_off
  FOR EACH ROW EXECUTE FUNCTION public.verify_resource_time_off_tenant();

-- 10. Time-Off Overlap Prevention
-- Global time off (location_id IS NULL) must not overlap any active row for the same resource.
-- Location-specific rows for the same location must not overlap.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_resource_time_off_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check active rows
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping active time-off for same resource and location scope
  IF EXISTS (
    SELECT 1 FROM public.resource_time_off rto
    WHERE rto.id != NEW.id
      AND rto.tenant_id = NEW.tenant_id
      AND rto.resource_id = NEW.resource_id
      AND rto.is_active = true
      AND (
        -- Same location scope: both null or both same location
        (NEW.location_id IS NULL AND rto.location_id IS NULL)
        OR (NEW.location_id IS NOT NULL AND rto.location_id = NEW.location_id)
        -- Global blocks any location-specific
        OR (NEW.location_id IS NULL AND rto.location_id IS NOT NULL)
        OR (NEW.location_id IS NOT NULL AND rto.location_id IS NULL)
      )
      AND NEW.starts_at < rto.ends_at
      AND NEW.ends_at > rto.starts_at
  ) THEN
    RAISE EXCEPTION 'Time-off period overlaps with an existing active time-off entry for this resource';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_resource_time_off_overlap
  BEFORE INSERT OR UPDATE ON public.resource_time_off
  FOR EACH ROW EXECUTE FUNCTION public.check_resource_time_off_overlap();

-- 11. Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_resource_time_off_updated_at
  BEFORE UPDATE ON public.resource_time_off
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Indexes
-- ============================================================

CREATE INDEX idx_rto_tenant ON public.resource_time_off (tenant_id);
CREATE INDEX idx_rto_resource ON public.resource_time_off (resource_id);
CREATE INDEX idx_rto_location ON public.resource_time_off (location_id);
CREATE INDEX idx_rto_tenant_resource ON public.resource_time_off (tenant_id, resource_id);
CREATE INDEX idx_rto_tenant_resource_starts ON public.resource_time_off (tenant_id, resource_id, starts_at);
CREATE INDEX idx_rto_tenant_resource_ends ON public.resource_time_off (tenant_id, resource_id, ends_at);
CREATE INDEX idx_rto_tenant_resource_active ON public.resource_time_off (tenant_id, resource_id, is_active);
CREATE INDEX idx_rto_resource_range ON public.resource_time_off (resource_id, starts_at, ends_at);

-- 13. RLS Policies
-- ============================================================

ALTER TABLE public.resource_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rto_select_member"
  ON public.resource_time_off FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_time_off.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "rto_insert_owner_admin"
  ON public.resource_time_off FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_time_off.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "rto_update_owner_admin"
  ON public.resource_time_off FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_time_off.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "rto_delete_owner_admin"
  ON public.resource_time_off FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = resource_time_off.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- 14. Time-Off CRUD RPCs
-- ============================================================

-- Create time off
CREATE OR REPLACE FUNCTION public.create_resource_time_off(
  p_tenant_id uuid,
  p_resource_id uuid,
  p_location_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_starts_at timestamptz DEFAULT now(),
  p_ends_at timestamptz DEFAULT now() + interval '1 day',
  p_is_all_day boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = p_resource_id AND r.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource not found in this business';
  END IF;

  -- Verify location if provided
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = p_location_id AND l.tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Location not found in this business';
    END IF;
  END IF;

  -- Validate times
  IF p_starts_at >= p_ends_at THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;

  -- Insert (overlap trigger validates)
  INSERT INTO public.resource_time_off (
    tenant_id, resource_id, location_id, title, notes,
    starts_at, ends_at, is_all_day, is_active
  )
  VALUES (
    p_tenant_id, p_resource_id, p_location_id,
    CASE WHEN trim(COALESCE(p_title, '')) = '' THEN NULL ELSE trim(p_title) END,
    CASE WHEN trim(COALESCE(p_notes, '')) = '' THEN NULL ELSE trim(p_notes) END,
    p_starts_at, p_ends_at, p_is_all_day, true
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean) TO authenticated;

-- Update time off
CREATE OR REPLACE FUNCTION public.update_resource_time_off(
  p_tenant_id uuid,
  p_time_off_id uuid,
  p_location_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_is_all_day boolean DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing record;
BEGIN
  -- Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify time-off belongs to tenant
  SELECT * INTO existing FROM public.resource_time_off
  WHERE id = p_time_off_id AND tenant_id = p_tenant_id;

  IF existing IS NULL THEN
    RAISE EXCEPTION 'Time-off entry not found';
  END IF;

  -- Verify location if changing
  IF p_location_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = p_location_id AND l.tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Location not found in this business';
    END IF;
  END IF;

  -- Update (overlap trigger validates if active or range changed)
  UPDATE public.resource_time_off SET
    location_id = COALESCE(p_location_id, existing.location_id),
    title = CASE WHEN p_title IS NOT NULL THEN
              CASE WHEN trim(p_title) = '' THEN NULL ELSE trim(p_title) END
            ELSE existing.title END,
    notes = CASE WHEN p_notes IS NOT NULL THEN
              CASE WHEN trim(p_notes) = '' THEN NULL ELSE trim(p_notes) END
            ELSE existing.notes END,
    starts_at = COALESCE(p_starts_at, existing.starts_at),
    ends_at = COALESCE(p_ends_at, existing.ends_at),
    is_all_day = COALESCE(p_is_all_day, existing.is_all_day),
    is_active = COALESCE(p_is_active, existing.is_active)
  WHERE id = p_time_off_id AND tenant_id = p_tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, boolean) TO authenticated;

-- Delete time off
CREATE OR REPLACE FUNCTION public.delete_resource_time_off(
  p_tenant_id uuid,
  p_time_off_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify and delete
  IF NOT EXISTS (
    SELECT 1 FROM public.resource_time_off
    WHERE id = p_time_off_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Time-off entry not found';
  END IF;

  DELETE FROM public.resource_time_off
  WHERE id = p_time_off_id AND tenant_id = p_tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_resource_time_off(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_resource_time_off(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_resource_time_off(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.create_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean) IS
  'Creates a time-off entry for a resource. Validates ownership and checks for overlaps.';
COMMENT ON FUNCTION public.update_resource_time_off(uuid, uuid, uuid, text, text, timestamptz, timestamptz, boolean, boolean) IS
  'Updates a time-off entry. Validates ownership and checks for overlaps on range/active changes.';
COMMENT ON FUNCTION public.delete_resource_time_off(uuid, uuid) IS
  'Deletes a time-off entry. Verifies ownership.';
