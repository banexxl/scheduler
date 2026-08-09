-- Milestone 12.2 — Staff Profiles & Resource Linking
-- ====================================================

-- ─── Staff Profiles ──────────────────────────────────────────────────────────

CREATE TABLE public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  tenant_member_id UUID NULL REFERENCES public.tenant_members(id) ON DELETE SET NULL,

  display_name TEXT NOT NULL,
  job_title TEXT NULL,
  bio TEXT NULL,
  avatar_url TEXT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_profiles IS
  'Links scheduling resources to human staff identity. Optional account link. Milestone 12.2.';

-- Constraints
ALTER TABLE public.staff_profiles
  ADD CONSTRAINT sp_display_name_length CHECK (char_length(trim(display_name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT sp_job_title_length CHECK (job_title IS NULL OR char_length(trim(job_title)) <= 120),
  ADD CONSTRAINT sp_bio_length CHECK (bio IS NULL OR char_length(bio) <= 2000);

-- One staff profile per resource
CREATE UNIQUE INDEX idx_sp_unique_resource
  ON public.staff_profiles (tenant_id, resource_id);

-- One staff profile per linked member (where non-null)
CREATE UNIQUE INDEX idx_sp_unique_member
  ON public.staff_profiles (tenant_id, tenant_member_id)
  WHERE tenant_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sp_staff_tenant_active ON public.staff_profiles (tenant_id, is_active);

CREATE TRIGGER trg_sp_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tenant consistency trigger
CREATE OR REPLACE FUNCTION public.verify_staff_profile_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources
    WHERE id = NEW.resource_id AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to this tenant';
  END IF;

  -- Verify member belongs to tenant (if linked)
  IF NEW.tenant_member_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE id = NEW.tenant_member_id AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Team member does not belong to this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sp_tenant_consistency
  BEFORE INSERT OR UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.verify_staff_profile_tenant_consistency();

-- RLS
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select_member"
  ON public.staff_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = staff_profiles.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );
