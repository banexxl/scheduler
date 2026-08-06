-- Migration: Location Schedule Exceptions
-- Date-specific overrides for location working hours (holidays, special hours).

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE public.location_schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  name text NOT NULL,
  is_closed boolean NOT NULL DEFAULT true,
  opens_at time NULL,
  closes_at time NULL,
  notes text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, exception_date)
);

-- Constraints
ALTER TABLE public.location_schedule_exceptions
  ADD CONSTRAINT lse_name_nonempty CHECK (char_length(trim(name)) >= 1),
  ADD CONSTRAINT lse_name_max_length CHECK (char_length(name) <= 120),
  ADD CONSTRAINT lse_notes_max_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
  ADD CONSTRAINT lse_closed_no_times CHECK (
    (is_closed = true AND opens_at IS NULL AND closes_at IS NULL)
    OR (is_closed = false AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at)
  );

COMMENT ON TABLE public.location_schedule_exceptions IS 'Date-specific schedule overrides for locations. One exception per location per date.';

-- ============================================================
-- 2. Updated-at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_location_schedule_exceptions_updated_at
  BEFORE UPDATE ON public.location_schedule_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.location_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant members
CREATE POLICY "lse_select_member"
  ON public.location_schedule_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = location_schedule_exceptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- INSERT: owner/admin only
CREATE POLICY "lse_insert_owner_admin"
  ON public.location_schedule_exceptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = location_schedule_exceptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: owner/admin only
CREATE POLICY "lse_update_owner_admin"
  ON public.location_schedule_exceptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = location_schedule_exceptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- DELETE: owner/admin only
CREATE POLICY "lse_delete_owner_admin"
  ON public.location_schedule_exceptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = location_schedule_exceptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 4. Create RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_location_schedule_exception(
  target_tenant_id uuid,
  target_location_id uuid,
  p_exception_date date,
  p_name text,
  p_is_closed boolean,
  p_opens_at time DEFAULT NULL,
  p_closes_at time DEFAULT NULL,
  p_notes text DEFAULT NULL
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
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify location belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = target_location_id
      AND l.tenant_id = target_tenant_id
  ) THEN
    RAISE EXCEPTION 'Location not found in this business';
  END IF;

  INSERT INTO public.location_schedule_exceptions (
    tenant_id, location_id, exception_date, name, is_closed, opens_at, closes_at, notes, created_by
  ) VALUES (
    target_tenant_id, target_location_id, p_exception_date, trim(p_name),
    p_is_closed,
    CASE WHEN p_is_closed THEN NULL ELSE p_opens_at END,
    CASE WHEN p_is_closed THEN NULL ELSE p_closes_at END,
    CASE WHEN trim(COALESCE(p_notes, '')) = '' THEN NULL ELSE trim(p_notes) END,
    auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_location_schedule_exception(uuid, uuid, date, text, boolean, time, time, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_location_schedule_exception(uuid, uuid, date, text, boolean, time, time, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_location_schedule_exception(uuid, uuid, date, text, boolean, time, time, text) TO authenticated;

-- ============================================================
-- 5. Update RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_location_schedule_exception(
  target_tenant_id uuid,
  target_exception_id uuid,
  p_exception_date date,
  p_name text,
  p_is_closed boolean,
  p_opens_at time DEFAULT NULL,
  p_closes_at time DEFAULT NULL,
  p_notes text DEFAULT NULL
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
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify exception belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.location_schedule_exceptions e
    WHERE e.id = target_exception_id
      AND e.tenant_id = target_tenant_id
  ) THEN
    RAISE EXCEPTION 'Exception not found';
  END IF;

  UPDATE public.location_schedule_exceptions SET
    exception_date = p_exception_date,
    name = trim(p_name),
    is_closed = p_is_closed,
    opens_at = CASE WHEN p_is_closed THEN NULL ELSE p_opens_at END,
    closes_at = CASE WHEN p_is_closed THEN NULL ELSE p_closes_at END,
    notes = CASE WHEN trim(COALESCE(p_notes, '')) = '' THEN NULL ELSE trim(p_notes) END
  WHERE id = target_exception_id
    AND tenant_id = target_tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_location_schedule_exception(uuid, uuid, date, text, boolean, time, time, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_location_schedule_exception(uuid, uuid, date, text, boolean, time, time, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_location_schedule_exception(uuid, uuid, date, text, boolean, time, time, text) TO authenticated;

-- ============================================================
-- 6. Delete RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_location_schedule_exception(
  target_tenant_id uuid,
  target_exception_id uuid
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
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify and delete
  DELETE FROM public.location_schedule_exceptions
  WHERE id = target_exception_id
    AND tenant_id = target_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exception not found';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_location_schedule_exception(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_location_schedule_exception(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_location_schedule_exception(uuid, uuid) TO authenticated;
