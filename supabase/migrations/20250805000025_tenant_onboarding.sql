-- Migration: tenant onboarding state
-- Creates a dedicated onboarding record per tenant and keeps progress derived from real data.

CREATE TABLE IF NOT EXISTS public.tenant_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'business_details',
  status text NOT NULL DEFAULT 'not_started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  skipped_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_onboarding_tenant UNIQUE (tenant_id)
);

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN current_step SET DEFAULT 'business_details';

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN status SET DEFAULT 'not_started';

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN started_at SET DEFAULT now();

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN last_activity_at SET DEFAULT now();

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN skipped_steps SET DEFAULT '[]'::jsonb;

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.tenant_onboarding
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_tenant ON public.tenant_onboarding (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_status ON public.tenant_onboarding (status);

ALTER TABLE public.tenant_onboarding ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_onboarding'
      AND policyname = 'tenant_onboarding_select_member'
  ) THEN
    CREATE POLICY tenant_onboarding_select_member
      ON public.tenant_onboarding
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = tenant_onboarding.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_onboarding'
      AND policyname = 'tenant_onboarding_insert_owner_admin'
  ) THEN
    CREATE POLICY tenant_onboarding_insert_owner_admin
      ON public.tenant_onboarding
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = tenant_onboarding.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
            AND tm.role IN ('owner','admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tenant_onboarding'
      AND policyname = 'tenant_onboarding_update_owner_admin'
  ) THEN
    CREATE POLICY tenant_onboarding_update_owner_admin
      ON public.tenant_onboarding
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.tenant_members tm
          WHERE tm.tenant_id = tenant_onboarding.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'active'
            AND tm.role IN ('owner','admin')
        )
      );
  END IF;
END $$;
