-- Migration: Fix RLS infinite recursion on tenant_members
--
-- Root cause: Multiple SELECT policies exist on tenant_members from different migrations.
-- Some reference tenants/tenant_members causing circular evaluation.
--
-- Fix: Drop ALL existing SELECT policies on tenant_members and create ONE simple policy.
-- All other tables that reference tenant_members via EXISTS subqueries will then work
-- because tenant_members SELECT is non-recursive (simple user_id = auth.uid()).

-- ============================================================
-- 1. Drop ALL existing SELECT policies on tenant_members
-- ============================================================
DROP POLICY IF EXISTS "tenant_members_select" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_select_member" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_select_policy" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant members can view their own memberships" ON public.tenant_members;
DROP POLICY IF EXISTS "Members can view tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_select_own" ON public.tenant_members;

-- ============================================================
-- 2. Create ONE clean non-recursive SELECT policy
-- ============================================================
-- Simple: each user can only read their own membership rows.
-- This is sufficient because all auth checks do WHERE user_id = auth.uid().
-- Owner/admin seeing other members is handled at the application layer.
CREATE POLICY "tenant_members_select"
  ON public.tenant_members
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 3. Fix tenants SELECT policy (ensure it only references tenant_members, not itself)
-- ============================================================
DROP POLICY IF EXISTS "tenants_select_member" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
DROP POLICY IF EXISTS "Tenants are viewable by members" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select_policy" ON public.tenants;

CREATE POLICY "tenants_select_member"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ============================================================
-- 4. Ensure tenant_public_booking_settings has proper RLS
-- ============================================================
ALTER TABLE IF EXISTS public.tenant_public_booking_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tpbs_select_member" ON public.tenant_public_booking_settings;
DROP POLICY IF EXISTS "tpbs_insert_owner_admin" ON public.tenant_public_booking_settings;
DROP POLICY IF EXISTS "tpbs_update_owner_admin" ON public.tenant_public_booking_settings;

CREATE POLICY "tpbs_select_member"
  ON public.tenant_public_booking_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "tpbs_insert_owner_admin"
  ON public.tenant_public_booking_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tpbs_update_owner_admin"
  ON public.tenant_public_booking_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );
