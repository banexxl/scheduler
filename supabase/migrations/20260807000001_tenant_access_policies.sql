-- Migration: Allow authenticated users to read tenant and membership rows needed for backoffice access.
-- This fixes the onboarding redirect path where the new tenant exists but the dashboard still returns 404.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenants'
      AND policyname = 'tenants_select_member'
  ) THEN
    CREATE POLICY tenants_select_member
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
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_members'
      AND policyname = 'tenant_members_select_member'
  ) THEN
    CREATE POLICY tenant_members_select_member
      ON public.tenant_members
      FOR SELECT
      USING (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = tenant_members.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
            AND tm.role IN ('owner', 'admin')
        )
      );
  END IF;
END
$$;
