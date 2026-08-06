-- Migration: Location Working Hours
-- Creates table, auto-initialization trigger, RLS policies, and replace RPC.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.location_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_closed boolean NOT NULL DEFAULT false,
  opens_at time,
  closes_at time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, day_of_week)
);

COMMENT ON TABLE public.location_working_hours IS 'Weekly working hours per location. Exactly 7 rows per location (Mon=1..Sun=0).';
COMMENT ON COLUMN public.location_working_hours.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';

-- ============================================================
-- 2. Auto-initialization trigger
-- Inserts 7 default rows when a location is created.
-- Mon-Fri: 09:00–17:00, Sat: 09:00–13:00, Sun: closed
-- ============================================================

CREATE OR REPLACE FUNCTION public.initialize_location_working_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.location_working_hours (location_id, day_of_week, is_closed, opens_at, closes_at)
  VALUES
    (NEW.id, 0, true,  NULL,    NULL),    -- Sunday (closed)
    (NEW.id, 1, false, '09:00', '17:00'), -- Monday
    (NEW.id, 2, false, '09:00', '17:00'), -- Tuesday
    (NEW.id, 3, false, '09:00', '17:00'), -- Wednesday
    (NEW.id, 4, false, '09:00', '17:00'), -- Thursday
    (NEW.id, 5, false, '09:00', '17:00'), -- Friday
    (NEW.id, 6, false, '09:00', '13:00'); -- Saturday
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_initialize_location_working_hours
  AFTER INSERT ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_location_working_hours();

-- ============================================================
-- 3. RLS Policies
-- ============================================================

ALTER TABLE public.location_working_hours ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant members can read (join through locations)
CREATE POLICY "working_hours_select_member"
  ON public.location_working_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      JOIN public.tenant_members tm ON tm.tenant_id = l.tenant_id
      WHERE l.id = location_working_hours.location_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- UPDATE: only owner/admin
CREATE POLICY "working_hours_update_owner_admin"
  ON public.location_working_hours FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.locations l
      JOIN public.tenant_members tm ON tm.tenant_id = l.tenant_id
      WHERE l.id = location_working_hours.location_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- No INSERT/DELETE by users — managed by trigger and RPC only

-- ============================================================
-- 4. replace_location_working_hours RPC
-- Atomically replaces all 7 working-hour rows for a location.
-- ============================================================

CREATE OR REPLACE FUNCTION public.replace_location_working_hours(
  target_location_id uuid,
  hours jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  loc_tenant_id uuid;
  entry jsonb;
  day_val smallint;
  is_closed_val boolean;
  opens_val time;
  closes_val time;
BEGIN
  -- Get tenant_id from the location
  SELECT l.tenant_id INTO loc_tenant_id
  FROM public.locations l
  WHERE l.id = target_location_id;

  IF loc_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Location not found';
  END IF;

  -- Verify caller is owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = loc_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Validate input: must be array of 7
  IF jsonb_array_length(hours) != 7 THEN
    RAISE EXCEPTION 'Exactly 7 day entries required';
  END IF;

  -- Delete existing and re-insert
  DELETE FROM public.location_working_hours
  WHERE location_id = target_location_id;

  FOR i IN 0..6 LOOP
    entry := hours -> i;

    day_val := (entry ->> 'dayOfWeek')::smallint;
    is_closed_val := (entry ->> 'isClosed')::boolean;

    IF is_closed_val THEN
      opens_val := NULL;
      closes_val := NULL;
    ELSE
      opens_val := (entry ->> 'opensAt')::time;
      closes_val := (entry ->> 'closesAt')::time;

      IF opens_val IS NULL OR closes_val IS NULL THEN
        RAISE EXCEPTION 'Open day % must have opens_at and closes_at', day_val;
      END IF;

      IF opens_val >= closes_val THEN
        RAISE EXCEPTION 'opens_at must be before closes_at for day %', day_val;
      END IF;
    END IF;

    INSERT INTO public.location_working_hours (location_id, day_of_week, is_closed, opens_at, closes_at, updated_at)
    VALUES (target_location_id, day_val, is_closed_val, opens_val, closes_val, now());
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_location_working_hours(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_location_working_hours(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_location_working_hours(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.replace_location_working_hours(uuid, jsonb) IS
  'Atomically replaces all 7 working-hour entries for a location. Verifies owner/admin role. Input is a JSON array of 7 day objects.';
