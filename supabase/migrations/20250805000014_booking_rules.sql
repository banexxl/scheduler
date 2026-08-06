-- Migration: Booking Rules
-- Introduces tenant_booking_rules and service_booking_rules tables
-- for defining booking constraints and availability policies.

-- ============================================================
-- PART A: Tenant Booking Rules
-- ============================================================

-- 1. Table
-- ============================================================

CREATE TABLE public.tenant_booking_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  minimum_notice_minutes integer NOT NULL DEFAULT 0,
  maximum_advance_days integer NOT NULL DEFAULT 90,
  slot_interval_minutes integer NOT NULL DEFAULT 15,
  cancellation_notice_minutes integer NOT NULL DEFAULT 0,
  reschedule_notice_minutes integer NOT NULL DEFAULT 0,
  allow_same_day_booking boolean NOT NULL DEFAULT true,
  allow_customer_cancellation boolean NOT NULL DEFAULT true,
  allow_customer_rescheduling boolean NOT NULL DEFAULT true,
  require_customer_phone boolean NOT NULL DEFAULT false,
  require_customer_email boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

COMMENT ON TABLE public.tenant_booking_rules IS
  'Tenant-level booking policy defaults. One row per tenant. Null row means application defaults apply.';

-- 2. Constraints
-- ============================================================

ALTER TABLE public.tenant_booking_rules
  ADD CONSTRAINT tbr_minimum_notice_min CHECK (minimum_notice_minutes >= 0),
  ADD CONSTRAINT tbr_minimum_notice_max CHECK (minimum_notice_minutes <= 525600),
  ADD CONSTRAINT tbr_maximum_advance_range CHECK (maximum_advance_days BETWEEN 1 AND 730),
  ADD CONSTRAINT tbr_slot_interval_range CHECK (slot_interval_minutes BETWEEN 5 AND 120),
  ADD CONSTRAINT tbr_cancellation_notice_min CHECK (cancellation_notice_minutes >= 0),
  ADD CONSTRAINT tbr_cancellation_notice_max CHECK (cancellation_notice_minutes <= 525600),
  ADD CONSTRAINT tbr_reschedule_notice_min CHECK (reschedule_notice_minutes >= 0),
  ADD CONSTRAINT tbr_reschedule_notice_max CHECK (reschedule_notice_minutes <= 525600);

-- 3. Indexes
-- ============================================================

CREATE INDEX idx_tbr_tenant ON public.tenant_booking_rules (tenant_id);
CREATE INDEX idx_tbr_tenant_active ON public.tenant_booking_rules (tenant_id, is_active);

-- 4. Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_tenant_booking_rules_updated_at
  BEFORE UPDATE ON public.tenant_booking_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS Policies
-- ============================================================

ALTER TABLE public.tenant_booking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tbr_select_member"
  ON public.tenant_booking_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "tbr_insert_owner_admin"
  ON public.tenant_booking_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tbr_update_owner_admin"
  ON public.tenant_booking_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tbr_delete_owner_admin"
  ON public.tenant_booking_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART B: Service Booking Rule Overrides
-- ============================================================

-- 1. Table
-- ============================================================

CREATE TABLE public.service_booking_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  minimum_notice_minutes integer NULL,
  maximum_advance_days integer NULL,
  slot_interval_minutes integer NULL,
  cancellation_notice_minutes integer NULL,
  reschedule_notice_minutes integer NULL,
  allow_same_day_booking boolean NULL,
  allow_customer_cancellation boolean NULL,
  allow_customer_rescheduling boolean NULL,
  require_customer_phone boolean NULL,
  require_customer_email boolean NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, service_id)
);

COMMENT ON TABLE public.service_booking_rules IS
  'Optional service-level booking rule overrides. Null fields inherit from tenant_booking_rules.';

-- 2. Constraints
-- ============================================================

ALTER TABLE public.service_booking_rules
  ADD CONSTRAINT sbr_minimum_notice_min CHECK (minimum_notice_minutes IS NULL OR minimum_notice_minutes >= 0),
  ADD CONSTRAINT sbr_minimum_notice_max CHECK (minimum_notice_minutes IS NULL OR minimum_notice_minutes <= 525600),
  ADD CONSTRAINT sbr_maximum_advance_range CHECK (maximum_advance_days IS NULL OR maximum_advance_days BETWEEN 1 AND 730),
  ADD CONSTRAINT sbr_slot_interval_range CHECK (slot_interval_minutes IS NULL OR slot_interval_minutes BETWEEN 5 AND 120),
  ADD CONSTRAINT sbr_cancellation_notice_min CHECK (cancellation_notice_minutes IS NULL OR cancellation_notice_minutes >= 0),
  ADD CONSTRAINT sbr_cancellation_notice_max CHECK (cancellation_notice_minutes IS NULL OR cancellation_notice_minutes <= 525600),
  ADD CONSTRAINT sbr_reschedule_notice_min CHECK (reschedule_notice_minutes IS NULL OR reschedule_notice_minutes >= 0),
  ADD CONSTRAINT sbr_reschedule_notice_max CHECK (reschedule_notice_minutes IS NULL OR reschedule_notice_minutes <= 525600);

-- 3. Tenant-Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_service_booking_rule_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to this tenant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_service_booking_rule_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, service_id ON public.service_booking_rules
  FOR EACH ROW EXECUTE FUNCTION public.verify_service_booking_rule_tenant();

-- 4. Indexes
-- ============================================================

CREATE INDEX idx_sbr_tenant ON public.service_booking_rules (tenant_id);
CREATE INDEX idx_sbr_service ON public.service_booking_rules (service_id);
CREATE INDEX idx_sbr_tenant_service ON public.service_booking_rules (tenant_id, service_id);
CREATE INDEX idx_sbr_tenant_active ON public.service_booking_rules (tenant_id, is_active);

-- 5. Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_service_booking_rules_updated_at
  BEFORE UPDATE ON public.service_booking_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS Policies
-- ============================================================

ALTER TABLE public.service_booking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sbr_select_member"
  ON public.service_booking_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "sbr_insert_owner_admin"
  ON public.service_booking_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_booking_rules.service_id
        AND s.tenant_id = service_booking_rules.tenant_id
    )
  );

CREATE POLICY "sbr_update_owner_admin"
  ON public.service_booking_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "sbr_delete_owner_admin"
  ON public.service_booking_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_booking_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );
