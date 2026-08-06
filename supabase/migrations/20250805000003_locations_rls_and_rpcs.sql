-- Migration: Fix locations RLS policies and add management RPCs
-- Restricts location writes to owner/admin only.
-- Adds set_primary_location and delete_business_location RPCs.

-- ============================================================
-- 1. Fix locations RLS policies
-- Drop existing write policies that may allow manager/staff writes
-- ============================================================

-- Drop potentially over-permissive policies (safe if they don't exist)
DROP POLICY IF EXISTS "Tenant members can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Tenant members can update locations" ON public.locations;
DROP POLICY IF EXISTS "Tenant members can delete locations" ON public.locations;
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;

-- Ensure RLS is enabled
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant members can read their tenant's locations
CREATE POLICY "locations_select_member"
  ON public.locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- INSERT: only owner/admin can create locations
CREATE POLICY "locations_insert_owner_admin"
  ON public.locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: only owner/admin can update locations
CREATE POLICY "locations_update_owner_admin"
  ON public.locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- DELETE: only owner/admin can delete locations
CREATE POLICY "locations_delete_owner_admin"
  ON public.locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = locations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 2. set_primary_location RPC
-- Atomically switches the primary location for a tenant.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_primary_location(
  target_tenant_id uuid,
  target_location_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verify caller is an active owner/admin of the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify the target location belongs to the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = target_location_id
      AND l.tenant_id = target_tenant_id
  ) THEN
    RAISE EXCEPTION 'Location not found in this business';
  END IF;

  -- Unset all primary flags for this tenant
  UPDATE public.locations
  SET is_primary = false
  WHERE tenant_id = target_tenant_id
    AND is_primary = true;

  -- Set target as primary and ensure it's active
  UPDATE public.locations
  SET is_primary = true, is_active = true
  WHERE id = target_location_id
    AND tenant_id = target_tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_primary_location(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_primary_location(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_primary_location(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.set_primary_location(uuid, uuid) IS
  'Atomically switches the primary location for a tenant. Ensures exactly one primary location exists and that it is active.';

-- ============================================================
-- 3. delete_business_location RPC
-- Safely deletes a non-primary location with guards.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_business_location(
  target_tenant_id uuid,
  target_location_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  loc_is_primary boolean;
  location_count integer;
BEGIN
  -- Verify caller is an active owner/admin of the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  -- Verify the target location belongs to the tenant
  SELECT l.is_primary INTO loc_is_primary
  FROM public.locations l
  WHERE l.id = target_location_id
    AND l.tenant_id = target_tenant_id;

  IF loc_is_primary IS NULL THEN
    RAISE EXCEPTION 'Location not found in this business';
  END IF;

  -- Cannot delete primary location
  IF loc_is_primary THEN
    RAISE EXCEPTION 'Cannot delete the primary location';
  END IF;

  -- Cannot delete last location
  SELECT count(*) INTO location_count
  FROM public.locations
  WHERE tenant_id = target_tenant_id;

  IF location_count <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last location';
  END IF;

  -- Delete the location
  DELETE FROM public.locations
  WHERE id = target_location_id
    AND tenant_id = target_tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_business_location(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_business_location(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_business_location(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_business_location(uuid, uuid) IS
  'Safely deletes a non-primary location. Verifies ownership, prevents deletion of primary or last location.';
