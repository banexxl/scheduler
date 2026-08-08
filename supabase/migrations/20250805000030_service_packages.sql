-- Migration: Service Packages & Bundles (Milestone 8.9)
-- Introduces package definitions, service eligibility, customer ownership,
-- usage tracking, credit adjustments, and appointment correlation.

-- ============================================================
-- PART A: Service Packages
-- ============================================================

CREATE TABLE public.service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  total_credits integer NOT NULL,
  validity_days integer NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sp_name_length CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  CONSTRAINT sp_description_max CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT sp_credits_min CHECK (total_credits >= 1),
  CONSTRAINT sp_credits_max CHECK (total_credits <= 1000),
  CONSTRAINT sp_validity_min CHECK (validity_days IS NULL OR validity_days >= 1),
  CONSTRAINT sp_validity_max CHECK (validity_days IS NULL OR validity_days <= 3650),
  CONSTRAINT sp_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX idx_sp_tenant ON public.service_packages (tenant_id);
CREATE INDEX idx_sp_tenant_active ON public.service_packages (tenant_id, is_active);

CREATE TRIGGER trg_sp_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART B: Service Package Services (Eligibility)
-- ============================================================

CREATE TABLE public.service_package_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  credits_required integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sps_credits_min CHECK (credits_required >= 1),
  CONSTRAINT sps_credits_max CHECK (credits_required <= 100),
  UNIQUE (tenant_id, package_id, service_id)
);

CREATE INDEX idx_sps_package ON public.service_package_services (package_id);
CREATE INDEX idx_sps_service ON public.service_package_services (service_id);

-- ============================================================
-- PART C: Customer Packages (Ownership)
-- ============================================================

CREATE TABLE public.customer_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.service_packages(id) ON DELETE RESTRICT,
  credits_total integer NOT NULL,
  credits_remaining integer NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  status text NOT NULL DEFAULT 'active',
  assigned_by uuid NULL,
  assignment_note text NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cp_status_check CHECK (status IN ('active', 'exhausted', 'expired', 'cancelled')),
  CONSTRAINT cp_credits_total_min CHECK (credits_total >= 1),
  CONSTRAINT cp_credits_remaining_non_negative CHECK (credits_remaining >= 0),
  CONSTRAINT cp_credits_remaining_lte_total CHECK (credits_remaining <= credits_total + 100),
  CONSTRAINT cp_source_check CHECK (source IN ('manual', 'payment', 'promotion', 'migration', 'admin_adjustment')),
  CONSTRAINT cp_note_max CHECK (assignment_note IS NULL OR char_length(assignment_note) <= 500)
);

CREATE INDEX idx_cp_tenant ON public.customer_packages (tenant_id);
CREATE INDEX idx_cp_customer ON public.customer_packages (tenant_id, customer_id);
CREATE INDEX idx_cp_tenant_status ON public.customer_packages (tenant_id, status);
CREATE INDEX idx_cp_package ON public.customer_packages (package_id);

CREATE TRIGGER trg_cp_updated_at
  BEFORE UPDATE ON public.customer_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART D: Customer Package Usage
-- ============================================================

CREATE TABLE public.customer_package_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_package_id uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  credits_used integer NOT NULL,
  status text NOT NULL DEFAULT 'reserved',
  reserved_at timestamptz NULL DEFAULT now(),
  consumed_at timestamptz NULL,
  released_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpu_status_check CHECK (status IN ('reserved', 'consumed', 'released')),
  CONSTRAINT cpu_credits_min CHECK (credits_used >= 1),
  CONSTRAINT cpu_consumed_requires_at CHECK (status <> 'consumed' OR consumed_at IS NOT NULL),
  CONSTRAINT cpu_released_requires_at CHECK (status <> 'released' OR released_at IS NOT NULL)
);

CREATE INDEX idx_cpu_customer_package ON public.customer_package_usage (customer_package_id);
CREATE INDEX idx_cpu_appointment ON public.customer_package_usage (appointment_id);
CREATE INDEX idx_cpu_tenant ON public.customer_package_usage (tenant_id);

CREATE TRIGGER trg_cpu_updated_at
  BEFORE UPDATE ON public.customer_package_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART E: Customer Package Adjustments (Audit)
-- ============================================================

CREATE TABLE public.customer_package_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_package_id uuid NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  adjusted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpa_reason_length CHECK (char_length(trim(reason)) BETWEEN 1 AND 500),
  CONSTRAINT cpa_delta_non_zero CHECK (delta <> 0)
);

CREATE INDEX idx_cpa_customer_package ON public.customer_package_adjustments (customer_package_id);

-- ============================================================
-- PART F: Appointment Package Correlation
-- ============================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_package_id uuid NULL,
  ADD COLUMN IF NOT EXISTS customer_package_usage_id uuid NULL,
  ADD COLUMN IF NOT EXISTS package_name_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS package_credits_used integer NULL;

-- ============================================================
-- PART G: Reserve Credits RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reserve_customer_package_credits(
  p_tenant_id uuid,
  p_customer_package_id uuid,
  p_appointment_id uuid,
  p_service_id uuid,
  p_credits_required integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pkg record;
  v_usage_id uuid;
BEGIN
  -- Lock and load customer package
  SELECT id, tenant_id, credits_remaining, status, expires_at
  INTO v_pkg
  FROM public.customer_packages
  WHERE id = p_customer_package_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_pkg IS NULL THEN
    RAISE EXCEPTION 'Customer package not found';
  END IF;

  IF v_pkg.status <> 'active' THEN
    RAISE EXCEPTION 'Package is not active (status: %)', v_pkg.status;
  END IF;

  IF v_pkg.expires_at IS NOT NULL AND v_pkg.expires_at <= now() THEN
    RAISE EXCEPTION 'Package has expired';
  END IF;

  IF v_pkg.credits_remaining < p_credits_required THEN
    RAISE EXCEPTION 'Insufficient credits (remaining: %, required: %)', v_pkg.credits_remaining, p_credits_required;
  END IF;

  -- Verify service eligibility
  IF NOT EXISTS (
    SELECT 1 FROM public.service_package_services sps
    INNER JOIN public.customer_packages cp ON cp.package_id = sps.package_id
    WHERE cp.id = p_customer_package_id
      AND sps.service_id = p_service_id
      AND sps.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Service is not eligible for this package';
  END IF;

  -- Decrement credits
  UPDATE public.customer_packages
  SET credits_remaining = credits_remaining - p_credits_required
  WHERE id = p_customer_package_id;

  -- Insert usage row
  INSERT INTO public.customer_package_usage (
    tenant_id, customer_package_id, appointment_id, service_id, credits_used, status, reserved_at
  ) VALUES (
    p_tenant_id, p_customer_package_id, p_appointment_id, p_service_id, p_credits_required, 'reserved', now()
  ) RETURNING id INTO v_usage_id;

  -- Mark exhausted if needed
  IF v_pkg.credits_remaining - p_credits_required = 0 THEN
    UPDATE public.customer_packages SET status = 'exhausted' WHERE id = p_customer_package_id;
  END IF;

  RETURN v_usage_id;
END;
$$;

-- ============================================================
-- PART H: Consume Credits RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.consume_customer_package_usage(
  p_tenant_id uuid,
  p_usage_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.customer_package_usage
  SET status = 'consumed', consumed_at = now()
  WHERE id = p_usage_id AND tenant_id = p_tenant_id AND status = 'reserved';
END;
$$;

-- ============================================================
-- PART I: Release Credits RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.release_customer_package_usage(
  p_tenant_id uuid,
  p_usage_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage record;
BEGIN
  SELECT id, customer_package_id, credits_used, status
  INTO v_usage
  FROM public.customer_package_usage
  WHERE id = p_usage_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_usage IS NULL OR v_usage.status <> 'reserved' THEN
    RETURN; -- Already consumed or released, no-op
  END IF;

  -- Mark released
  UPDATE public.customer_package_usage
  SET status = 'released', released_at = now()
  WHERE id = p_usage_id;

  -- Restore credits
  UPDATE public.customer_packages
  SET
    credits_remaining = credits_remaining + v_usage.credits_used,
    status = CASE
      WHEN status = 'exhausted' THEN 'active'
      ELSE status
    END
  WHERE id = v_usage.customer_package_id;
END;
$$;

-- ============================================================
-- PART J: Tenant Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_service_package_services_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.service_packages sp
    WHERE sp.id = NEW.package_id AND sp.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Package does not belong to tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_sps_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, package_id, service_id
  ON public.service_package_services
  FOR EACH ROW EXECUTE FUNCTION public.verify_service_package_services_tenant();

-- ============================================================
-- PART K: RLS
-- ============================================================

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_package_adjustments ENABLE ROW LEVEL SECURITY;

-- Members can read all package tables
CREATE POLICY "sp_select_member" ON public.service_packages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = service_packages.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "sps_select_member" ON public.service_package_services FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = service_package_services.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "cp_select_member" ON public.customer_packages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_packages.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "cpu_select_member" ON public.customer_package_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_package_usage.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

CREATE POLICY "cpa_select_member" ON public.customer_package_adjustments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_package_adjustments.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

-- Owner/admin mutations for package definitions
CREATE POLICY "sp_insert_owner_admin" ON public.service_packages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = service_packages.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "sp_update_owner_admin" ON public.service_packages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = service_packages.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "sps_insert_owner_admin" ON public.service_package_services FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = service_package_services.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

CREATE POLICY "sps_delete_owner_admin" ON public.service_package_services FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = service_package_services.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')
  ));

-- ============================================================
-- END OF MIGRATION
-- ============================================================
