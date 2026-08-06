-- Migration: Location Business Hours and Closures
-- Introduces location_business_hours, location_schedule_exceptions,
-- and location_exception_periods tables.

-- ============================================================
-- PART A: Recurring Location Business Hours
-- ============================================================

-- 1. Table
CREATE TABLE public.location_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.location_business_hours
  ADD CONSTRAINT lbh_day_of_week_range CHECK (day_of_week BETWEEN 1 AND 7),
  ADD CONSTRAINT lbh_start_before_end CHECK (start_time < end_time),
  ADD CONSTRAINT lbh_sort_order_non_negative CHECK (sort_order >= 0);

COMMENT ON TABLE public.location_business_hours IS
  'Recurring weekly business hours for locations. Day: 1=Mon..7=Sun. Times in tenant-local wall clock.';

-- 2. Tenant-Consistency Trigger
CREATE OR REPLACE FUNCTION public.verify_location_business_hour_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = NEW.location_id AND l.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Location does not belong to this tenant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_location_business_hour_tenant
  BEFORE INSERT OR UPDATE ON public.location_business_hours
  FOR EACH ROW EXECUTE FUNCTION public.verify_location_business_hour_tenant();

-- 3. Overlap Prevention Trigger
CREATE OR REPLACE FUNCTION public.check_location_business_hour_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT NEW.is_active THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.location_business_hours lbh
    WHERE lbh.id != NEW.id
      AND lbh.tenant_id = NEW.tenant_id
      AND lbh.location_id = NEW.location_id
      AND lbh.day_of_week = NEW.day_of_week
      AND lbh.is_active = true
      AND NEW.start_time < lbh.end_time
      AND NEW.end_time > lbh.start_time
  ) THEN
    RAISE EXCEPTION 'Business hour period overlaps with an existing active period for this location and day';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_location_business_hour_overlap
  BEFORE INSERT OR UPDATE ON public.location_business_hours
  FOR EACH ROW EXECUTE FUNCTION public.check_location_business_hour_overlap();

-- 4. Updated-At Trigger
CREATE TRIGGER trg_location_business_hours_updated_at
  BEFORE UPDATE ON public.location_business_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Indexes
CREATE INDEX idx_lbh_tenant ON public.location_business_hours (tenant_id);
CREATE INDEX idx_lbh_location ON public.location_business_hours (location_id);
CREATE INDEX idx_lbh_tenant_location ON public.location_business_hours (tenant_id, location_id);
CREATE INDEX idx_lbh_tenant_location_day ON public.location_business_hours (tenant_id, location_id, day_of_week);
CREATE INDEX idx_lbh_tenant_location_active ON public.location_business_hours (tenant_id, location_id, is_active);
CREATE INDEX idx_lbh_location_day_start ON public.location_business_hours (location_id, day_of_week, start_time, sort_order);

-- 6. RLS Policies
ALTER TABLE public.location_business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lbh_select_member" ON public.location_business_hours FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_business_hours.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "lbh_insert_owner_admin" ON public.location_business_hours FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_business_hours.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "lbh_update_owner_admin" ON public.location_business_hours FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_business_hours.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "lbh_delete_owner_admin" ON public.location_business_hours FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_business_hours.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ));

-- 7. set_location_business_hours RPC
CREATE OR REPLACE FUNCTION public.set_location_business_hours(
  p_tenant_id uuid,
  p_location_id uuid,
  p_periods jsonb
)
RETURNS SETOF public.location_business_hours
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  period jsonb;
  d_of_week smallint;
  s_time time;
  e_time time;
BEGIN
  -- Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify location belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = p_location_id AND l.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Location not found in this business';
  END IF;

  -- Handle empty: clear schedule
  IF p_periods IS NULL OR jsonb_array_length(p_periods) = 0 THEN
    DELETE FROM public.location_business_hours
    WHERE location_id = p_location_id AND tenant_id = p_tenant_id;
    RETURN QUERY SELECT * FROM public.location_business_hours WHERE false;
    RETURN;
  END IF;

  -- Validate periods
  FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
    d_of_week := (period->>'day_of_week')::smallint;
    IF d_of_week IS NULL OR d_of_week NOT BETWEEN 1 AND 7 THEN
      RAISE EXCEPTION 'Invalid day_of_week: must be between 1 and 7';
    END IF;
    s_time := (period->>'start_time')::time;
    e_time := (period->>'end_time')::time;
    IF s_time IS NULL OR e_time IS NULL THEN
      RAISE EXCEPTION 'start_time and end_time are required';
    END IF;
    IF s_time >= e_time THEN
      RAISE EXCEPTION 'start_time must be before end_time';
    END IF;
  END LOOP;

  -- Check overlaps within submitted set
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_periods) a, jsonb_array_elements(p_periods) b
    WHERE a::text < b::text
      AND COALESCE((a->>'is_active')::boolean, true) = true
      AND COALESCE((b->>'is_active')::boolean, true) = true
      AND (a->>'day_of_week')::smallint = (b->>'day_of_week')::smallint
      AND (a->>'start_time')::time < (b->>'end_time')::time
      AND (a->>'end_time')::time > (b->>'start_time')::time
  ) THEN
    RAISE EXCEPTION 'Submitted schedule contains overlapping active periods';
  END IF;

  -- Replace: delete existing, insert new
  DELETE FROM public.location_business_hours
  WHERE location_id = p_location_id AND tenant_id = p_tenant_id;

  FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
    INSERT INTO public.location_business_hours (
      tenant_id, location_id, day_of_week, start_time, end_time, is_active, sort_order
    ) VALUES (
      p_tenant_id, p_location_id,
      (period->>'day_of_week')::smallint,
      (period->>'start_time')::time,
      (period->>'end_time')::time,
      COALESCE((period->>'is_active')::boolean, true),
      COALESCE((period->>'sort_order')::integer, 0)
    );
  END LOOP;

  RETURN QUERY
    SELECT * FROM public.location_business_hours
    WHERE location_id = p_location_id AND tenant_id = p_tenant_id
    ORDER BY day_of_week, start_time, sort_order;
END;
$$;

REVOKE ALL ON FUNCTION public.set_location_business_hours(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_location_business_hours(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_location_business_hours(uuid, uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.set_location_business_hours(uuid, uuid, jsonb) IS
  'Atomically replaces weekly business hours for a location.';

-- ============================================================
-- PART B: Location Schedule Exceptions
-- ============================================================

-- 8. Exceptions Table
CREATE TABLE public.location_schedule_exceptions_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  exception_type text NOT NULL,
  title text NULL,
  notes text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.location_schedule_exceptions_v2
  ADD CONSTRAINT lse2_type_check CHECK (exception_type IN ('closed', 'custom_hours')),
  ADD CONSTRAINT lse2_title_length CHECK (title IS NULL OR char_length(trim(title)) BETWEEN 1 AND 120),
  ADD CONSTRAINT lse2_notes_max CHECK (notes IS NULL OR char_length(notes) <= 2000),
  ADD CONSTRAINT uq_lse2_tenant_location_date UNIQUE (tenant_id, location_id, exception_date);

COMMENT ON TABLE public.location_schedule_exceptions_v2 IS
  'Date-specific schedule exceptions for locations. Replaces normal hours for that date.';

-- 9. Exception Periods Table
CREATE TABLE public.location_exception_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exception_id uuid NOT NULL REFERENCES public.location_schedule_exceptions_v2(id) ON DELETE CASCADE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.location_exception_periods
  ADD CONSTRAINT lep_start_before_end CHECK (start_time < end_time),
  ADD CONSTRAINT lep_sort_order_non_negative CHECK (sort_order >= 0);

COMMENT ON TABLE public.location_exception_periods IS
  'Custom opening periods for custom_hours exceptions. Only valid for custom_hours type.';

-- 10. Exception Tenant-Consistency Triggers
CREATE OR REPLACE FUNCTION public.verify_location_schedule_exception_v2_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = NEW.location_id AND l.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Location does not belong to this tenant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_lse2_tenant
  BEFORE INSERT OR UPDATE ON public.location_schedule_exceptions_v2
  FOR EACH ROW EXECUTE FUNCTION public.verify_location_schedule_exception_v2_tenant();

CREATE OR REPLACE FUNCTION public.verify_location_exception_period_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  exc_type text;
BEGIN
  -- Verify parent exception belongs to tenant
  SELECT lse.exception_type INTO exc_type
  FROM public.location_schedule_exceptions_v2 lse
  WHERE lse.id = NEW.exception_id AND lse.tenant_id = NEW.tenant_id;

  IF exc_type IS NULL THEN
    RAISE EXCEPTION 'Exception does not belong to this tenant';
  END IF;

  -- Only custom_hours exceptions may have periods
  IF exc_type != 'custom_hours' THEN
    RAISE EXCEPTION 'Periods are only allowed for custom_hours exceptions';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_lep_tenant
  BEFORE INSERT OR UPDATE ON public.location_exception_periods
  FOR EACH ROW EXECUTE FUNCTION public.verify_location_exception_period_tenant();

-- 11. Exception Period Overlap Prevention
CREATE OR REPLACE FUNCTION public.check_location_exception_period_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.location_exception_periods lep
    WHERE lep.id != NEW.id
      AND lep.exception_id = NEW.exception_id
      AND NEW.start_time < lep.end_time
      AND NEW.end_time > lep.start_time
  ) THEN
    RAISE EXCEPTION 'Exception period overlaps with another period for this exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_lep_overlap
  BEFORE INSERT OR UPDATE ON public.location_exception_periods
  FOR EACH ROW EXECUTE FUNCTION public.check_location_exception_period_overlap();

-- 12. Updated-At Triggers
CREATE TRIGGER trg_lse2_updated_at
  BEFORE UPDATE ON public.location_schedule_exceptions_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lep_updated_at
  BEFORE UPDATE ON public.location_exception_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Exception Indexes
CREATE INDEX idx_lse2_tenant ON public.location_schedule_exceptions_v2 (tenant_id);
CREATE INDEX idx_lse2_location ON public.location_schedule_exceptions_v2 (location_id);
CREATE INDEX idx_lse2_tenant_location ON public.location_schedule_exceptions_v2 (tenant_id, location_id);
CREATE INDEX idx_lse2_tenant_date ON public.location_schedule_exceptions_v2 (tenant_id, exception_date);
CREATE INDEX idx_lse2_tenant_location_active ON public.location_schedule_exceptions_v2 (tenant_id, location_id, is_active);

CREATE INDEX idx_lep_tenant ON public.location_exception_periods (tenant_id);
CREATE INDEX idx_lep_exception ON public.location_exception_periods (exception_id);
CREATE INDEX idx_lep_tenant_exception ON public.location_exception_periods (tenant_id, exception_id);
CREATE INDEX idx_lep_exception_start ON public.location_exception_periods (exception_id, start_time, sort_order);

-- 14. Exception RLS
ALTER TABLE public.location_schedule_exceptions_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lse2_select_member" ON public.location_schedule_exceptions_v2 FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_schedule_exceptions_v2.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));
CREATE POLICY "lse2_insert_owner_admin" ON public.location_schedule_exceptions_v2 FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_schedule_exceptions_v2.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));
CREATE POLICY "lse2_update_owner_admin" ON public.location_schedule_exceptions_v2 FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_schedule_exceptions_v2.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));
CREATE POLICY "lse2_delete_owner_admin" ON public.location_schedule_exceptions_v2 FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_schedule_exceptions_v2.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

ALTER TABLE public.location_exception_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lep_select_member" ON public.location_exception_periods FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_exception_periods.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));
CREATE POLICY "lep_insert_owner_admin" ON public.location_exception_periods FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_exception_periods.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));
CREATE POLICY "lep_update_owner_admin" ON public.location_exception_periods FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_exception_periods.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));
CREATE POLICY "lep_delete_owner_admin" ON public.location_exception_periods FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = location_exception_periods.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

-- 15. Exception CRUD RPCs

-- Create exception with periods
CREATE OR REPLACE FUNCTION public.create_location_exception_v2(
  p_tenant_id uuid,
  p_location_id uuid,
  p_exception_date date,
  p_exception_type text,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_periods jsonb DEFAULT '[]'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_id uuid;
  period jsonb;
BEGIN
  -- Verify caller
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify location
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.id = p_location_id AND l.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Location not found in this business';
  END IF;

  -- Validate type
  IF p_exception_type NOT IN ('closed', 'custom_hours') THEN
    RAISE EXCEPTION 'Invalid exception type: must be closed or custom_hours';
  END IF;

  -- Closed must not have periods
  IF p_exception_type = 'closed' AND p_periods IS NOT NULL AND jsonb_array_length(p_periods) > 0 THEN
    RAISE EXCEPTION 'Closed exceptions must not have custom periods';
  END IF;

  -- Custom hours must have at least one period
  IF p_exception_type = 'custom_hours' AND (p_periods IS NULL OR jsonb_array_length(p_periods) = 0) THEN
    RAISE EXCEPTION 'Custom hours exceptions must have at least one period';
  END IF;

  -- Validate periods if custom_hours
  IF p_exception_type = 'custom_hours' THEN
    FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
      IF (period->>'start_time')::time >= (period->>'end_time')::time THEN
        RAISE EXCEPTION 'start_time must be before end_time in custom periods';
      END IF;
    END LOOP;
    -- Check overlaps within periods
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_periods) a, jsonb_array_elements(p_periods) b
      WHERE a::text < b::text
        AND (a->>'start_time')::time < (b->>'end_time')::time
        AND (a->>'end_time')::time > (b->>'start_time')::time
    ) THEN
      RAISE EXCEPTION 'Custom periods contain overlapping time ranges';
    END IF;
  END IF;

  -- Insert exception
  INSERT INTO public.location_schedule_exceptions_v2 (
    tenant_id, location_id, exception_date, exception_type, title, notes, is_active
  ) VALUES (
    p_tenant_id, p_location_id, p_exception_date, p_exception_type,
    CASE WHEN trim(COALESCE(p_title, '')) = '' THEN NULL ELSE trim(p_title) END,
    CASE WHEN trim(COALESCE(p_notes, '')) = '' THEN NULL ELSE trim(p_notes) END,
    p_is_active
  ) RETURNING id INTO new_id;

  -- Insert periods for custom_hours
  IF p_exception_type = 'custom_hours' AND p_periods IS NOT NULL THEN
    FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
      INSERT INTO public.location_exception_periods (
        tenant_id, exception_id, start_time, end_time, sort_order
      ) VALUES (
        p_tenant_id, new_id,
        (period->>'start_time')::time,
        (period->>'end_time')::time,
        COALESCE((period->>'sort_order')::integer, 0)
      );
    END LOOP;
  END IF;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_location_exception_v2(uuid, uuid, date, text, text, text, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_location_exception_v2(uuid, uuid, date, text, text, text, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_location_exception_v2(uuid, uuid, date, text, text, text, boolean, jsonb) TO authenticated;

-- Update exception with periods
CREATE OR REPLACE FUNCTION public.update_location_exception_v2(
  p_tenant_id uuid,
  p_exception_id uuid,
  p_exception_type text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_periods jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing record;
  final_type text;
  period jsonb;
BEGIN
  -- Verify caller
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Get existing
  SELECT * INTO existing FROM public.location_schedule_exceptions_v2
  WHERE id = p_exception_id AND tenant_id = p_tenant_id;
  IF existing IS NULL THEN
    RAISE EXCEPTION 'Exception not found';
  END IF;

  final_type := COALESCE(p_exception_type, existing.exception_type);

  -- Validate type
  IF final_type NOT IN ('closed', 'custom_hours') THEN
    RAISE EXCEPTION 'Invalid exception type';
  END IF;

  -- Update parent
  UPDATE public.location_schedule_exceptions_v2 SET
    exception_type = final_type,
    title = CASE WHEN p_title IS NOT NULL THEN
              CASE WHEN trim(p_title) = '' THEN NULL ELSE trim(p_title) END
            ELSE existing.title END,
    notes = CASE WHEN p_notes IS NOT NULL THEN
              CASE WHEN trim(p_notes) = '' THEN NULL ELSE trim(p_notes) END
            ELSE existing.notes END,
    is_active = COALESCE(p_is_active, existing.is_active)
  WHERE id = p_exception_id AND tenant_id = p_tenant_id;

  -- Replace periods if provided
  IF p_periods IS NOT NULL THEN
    -- Delete existing periods
    DELETE FROM public.location_exception_periods
    WHERE exception_id = p_exception_id AND tenant_id = p_tenant_id;

    IF final_type = 'closed' AND jsonb_array_length(p_periods) > 0 THEN
      RAISE EXCEPTION 'Closed exceptions must not have custom periods';
    END IF;

    IF final_type = 'custom_hours' AND jsonb_array_length(p_periods) = 0 THEN
      RAISE EXCEPTION 'Custom hours exceptions must have at least one period';
    END IF;

    IF final_type = 'custom_hours' THEN
      -- Validate
      FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
        IF (period->>'start_time')::time >= (period->>'end_time')::time THEN
          RAISE EXCEPTION 'start_time must be before end_time in custom periods';
        END IF;
      END LOOP;
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_periods) a, jsonb_array_elements(p_periods) b
        WHERE a::text < b::text
          AND (a->>'start_time')::time < (b->>'end_time')::time
          AND (a->>'end_time')::time > (b->>'start_time')::time
      ) THEN
        RAISE EXCEPTION 'Custom periods contain overlapping time ranges';
      END IF;
      -- Insert new periods
      FOR period IN SELECT * FROM jsonb_array_elements(p_periods) LOOP
        INSERT INTO public.location_exception_periods (
          tenant_id, exception_id, start_time, end_time, sort_order
        ) VALUES (
          p_tenant_id, p_exception_id,
          (period->>'start_time')::time,
          (period->>'end_time')::time,
          COALESCE((period->>'sort_order')::integer, 0)
        );
      END LOOP;
    END IF;
  ELSE
    -- If type changed to closed, remove existing periods
    IF final_type = 'closed' THEN
      DELETE FROM public.location_exception_periods
      WHERE exception_id = p_exception_id AND tenant_id = p_tenant_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_location_exception_v2(uuid, uuid, text, text, text, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_location_exception_v2(uuid, uuid, text, text, text, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_location_exception_v2(uuid, uuid, text, text, text, boolean, jsonb) TO authenticated;

-- Delete exception (cascades periods)
CREATE OR REPLACE FUNCTION public.delete_location_exception_v2(
  p_tenant_id uuid,
  p_exception_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid()
      AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.location_schedule_exceptions_v2
    WHERE id = p_exception_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Exception not found';
  END IF;

  DELETE FROM public.location_schedule_exceptions_v2
  WHERE id = p_exception_id AND tenant_id = p_tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_location_exception_v2(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_location_exception_v2(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_location_exception_v2(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.create_location_exception_v2(uuid, uuid, date, text, text, text, boolean, jsonb) IS
  'Creates a schedule exception with optional custom periods. Validates type rules.';
COMMENT ON FUNCTION public.update_location_exception_v2(uuid, uuid, text, text, text, boolean, jsonb) IS
  'Updates a schedule exception. Replaces periods atomically when provided.';
COMMENT ON FUNCTION public.delete_location_exception_v2(uuid, uuid) IS
  'Deletes a schedule exception and its periods.';
