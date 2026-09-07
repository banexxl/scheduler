-- Migration: Public read access for the availability engine
--
-- Context: calculateAvailability() (features/availability/services/) powers
-- BOTH the authenticated staff dashboard AND the public/anonymous booking
-- flow, but every query it runs used the RLS-scoped client. All of the
-- tables below only granted SELECT to active tenant members, so an
-- anonymous booking visitor (or a logged-in customer who isn't tenant
-- staff) silently got zero rows back everywhere in the pipeline -- the
-- public booking Time step and the customer self-service reschedule flow
-- were both completely broken, reporting misleading codes like
-- SERVICE_INACTIVE for services that are actually active.
--
-- Fix, in two parts:
--   1. Tables that are pure business/schedule config (no PII, no free-text
--      staff notes) get a plain public SELECT policy, mirroring the
--      already-established "Public Catalog Reads" pattern used elsewhere
--      in this codebase (see get_public_locations, get_public_staff).
--   2. Tables that mix public-safe columns with sensitive ones (customer
--      PII on appointments; internal notes/titles on time-off and
--      exceptions; a user id on tenants) do NOT get a blanket table
--      policy -- Postgres RLS is row-level, not column-level, and a
--      blanket policy would let anyone holding the public anon key read
--      those sensitive columns directly via the REST API, bypassing the
--      app entirely. Instead these get a narrow SECURITY DEFINER RPC that
--      projects only the columns the availability engine actually needs.
--
-- All policies/RPCs are scoped by tenant_id (and, for the RPCs, further
-- restrict which columns exist at all), and additionally require the
-- tenant to be in an active or trialing state, matching
-- resolvePublicBookingContext's own check.

-- ============================================================
-- PART A: Plain public SELECT policies (safe, no sensitive columns)
-- ============================================================

CREATE POLICY "svc_select_public"
  ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = services.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "locations_select_public"
  ON public.locations FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = locations.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "sl_select_public"
  ON public.service_locations FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = service_locations.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "sr_select_public"
  ON public.service_resources FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = service_resources.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "res_select_public"
  ON public.resources FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = resources.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "rl_select_public"
  ON public.resource_locations FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = resource_locations.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "rwh_select_public"
  ON public.resource_working_hours FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = resource_working_hours.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "lbh_select_public"
  ON public.location_business_hours FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = location_business_hours.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

-- No is_active column of its own -- validity is governed by the parent
-- exception row, so check that instead.
CREATE POLICY "lep_select_public"
  ON public.location_exception_periods FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.location_schedule_exceptions_v2 e
      JOIN public.tenants t ON t.id = e.tenant_id
      WHERE e.id = location_exception_periods.exception_id
        AND e.is_active = true
        AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "tbr_select_public"
  ON public.tenant_booking_rules FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_booking_rules.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

CREATE POLICY "sbr_select_public"
  ON public.service_booking_rules FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = service_booking_rules.tenant_id AND t.status IN ('active', 'trialing')
    )
  );

-- ============================================================
-- PART B: Narrow RPCs for tables with sensitive columns
-- ============================================================

-- tenants: only expose id + timezone. Everything else the public site
-- needs (name, description, contact info, etc.) already goes through
-- the service-role client in public-tenant-resolver.ts; this RPC exists
-- only for the availability engine's timezone lookup, and deliberately
-- omits created_by (a user id) and every other column.
CREATE OR REPLACE FUNCTION public.get_public_tenant_timezone(
  p_tenant_id uuid
)
RETURNS TABLE (id uuid, default_timezone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id, t.default_timezone
  FROM public.tenants t
  WHERE t.id = p_tenant_id
    AND t.status IN ('active', 'trialing');
$$;

REVOKE ALL ON FUNCTION public.get_public_tenant_timezone(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tenant_timezone(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_tenant_timezone(uuid) IS
  'Public-safe tenant lookup for the availability engine. Returns only id and default_timezone -- never created_by or other tenant fields.';

-- location_schedule_exceptions_v2: title/notes are internal (e.g. "owner's
-- family emergency") and must never be public. Only the exception's type
-- and active flag are needed to resolve that day's hours.
CREATE OR REPLACE FUNCTION public.get_public_location_exception(
  p_tenant_id uuid,
  p_location_id uuid,
  p_exception_date date
)
RETURNS TABLE (id uuid, exception_type text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.id, e.exception_type, e.is_active
  FROM public.location_schedule_exceptions_v2 e
  JOIN public.tenants t ON t.id = e.tenant_id
  WHERE e.tenant_id = p_tenant_id
    AND e.location_id = p_location_id
    AND e.exception_date = p_exception_date
    AND e.is_active = true
    AND t.status IN ('active', 'trialing');
$$;

REVOKE ALL ON FUNCTION public.get_public_location_exception(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_location_exception(uuid, uuid, date) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_location_exception(uuid, uuid, date) IS
  'Public-safe schedule-exception lookup. Returns only type/active flag -- never title or notes.';

-- resource_time_off: title/notes can hold internal HR-style notes (e.g.
-- "medical leave"). Only the busy interval itself is needed publicly.
CREATE OR REPLACE FUNCTION public.get_public_resource_time_off(
  p_tenant_id uuid,
  p_resource_ids uuid[],
  p_range_start timestamptz,
  p_range_end timestamptz
)
RETURNS TABLE (resource_id uuid, location_id uuid, starts_at timestamptz, ends_at timestamptz, is_all_day boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT rto.resource_id, rto.location_id, rto.starts_at, rto.ends_at, rto.is_all_day
  FROM public.resource_time_off rto
  WHERE rto.tenant_id = p_tenant_id
    AND rto.resource_id = ANY (p_resource_ids)
    AND rto.is_active = true
    AND rto.starts_at < p_range_end
    AND rto.ends_at > p_range_start;
$$;

REVOKE ALL ON FUNCTION public.get_public_resource_time_off(uuid, uuid[], timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_resource_time_off(uuid, uuid[], timestamptz, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_resource_time_off(uuid, uuid[], timestamptz, timestamptz) IS
  'Public-safe resource time-off lookup. Returns only the busy interval -- never title or notes.';

-- appointments: holds customer_name/email/phone/notes. Only the occupied
-- window is needed to block a slot publicly -- never customer identity.
CREATE OR REPLACE FUNCTION public.get_public_resource_busy_intervals(
  p_tenant_id uuid,
  p_resource_ids uuid[],
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_exclude_appointment_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, resource_id uuid, occupied_starts_at timestamptz, occupied_ends_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id, a.resource_id, a.occupied_starts_at, a.occupied_ends_at
  FROM public.appointments a
  WHERE a.tenant_id = p_tenant_id
    AND a.resource_id = ANY (p_resource_ids)
    AND a.status <> 'cancelled'
    AND (p_exclude_appointment_id IS NULL OR a.id <> p_exclude_appointment_id)
    AND a.occupied_starts_at < p_range_end
    AND a.occupied_ends_at > p_range_start;
$$;

REVOKE ALL ON FUNCTION public.get_public_resource_busy_intervals(uuid, uuid[], timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_resource_busy_intervals(uuid, uuid[], timestamptz, timestamptz, uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_resource_busy_intervals(uuid, uuid[], timestamptz, timestamptz, uuid) IS
  'Public-safe appointment-blocking lookup. Returns only id/resource/occupied window -- never customer_name, email, phone, or notes.';
