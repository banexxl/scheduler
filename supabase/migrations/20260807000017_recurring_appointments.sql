-- Migration: Recurring Appointments — Milestone 15.1
--
-- Creates appointment_series table and adds series reference columns to appointments.

-- ============================================================
-- 1. appointment_series table
-- ============================================================

CREATE TABLE public.appointment_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Customer
  customer_name TEXT NOT NULL,
  customer_email TEXT NULL,
  customer_phone TEXT NULL,
  customer_id UUID NULL,

  -- Service/Location/Resource
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  resource_id UUID NULL REFERENCES public.resources(id) ON DELETE SET NULL,

  -- Timezone (tenant timezone snapshot)
  timezone TEXT NOT NULL,

  -- Recurrence rule
  recurrence_type TEXT NOT NULL,
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  days_of_week INTEGER[] NULL,
  day_of_month INTEGER NULL,

  -- Bounds
  starts_on DATE NOT NULL,
  ends_on DATE NULL,
  occurrence_count INTEGER NULL,
  max_occurrences INTEGER NOT NULL DEFAULT 52,

  -- Time
  starts_at_local_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',

  -- Snapshots
  service_name_snapshot TEXT NOT NULL,
  location_name_snapshot TEXT NOT NULL,
  resource_name_snapshot TEXT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Audit
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ NULL,

  -- Constraints
  CONSTRAINT aps_recurrence_type_check CHECK (
    recurrence_type IN ('daily', 'weekly', 'monthly')
  ),
  CONSTRAINT aps_interval_positive CHECK (recurrence_interval > 0 AND recurrence_interval <= 12),
  CONSTRAINT aps_status_check CHECK (status IN ('active', 'completed', 'cancelled')),
  CONSTRAINT aps_end_condition CHECK (ends_on IS NOT NULL OR occurrence_count IS NOT NULL),
  CONSTRAINT aps_max_occurrences_check CHECK (max_occurrences > 0 AND max_occurrences <= 52),
  CONSTRAINT aps_occurrence_count_check CHECK (occurrence_count IS NULL OR (occurrence_count > 0 AND occurrence_count <= max_occurrences)),
  CONSTRAINT aps_duration_check CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  CONSTRAINT aps_days_of_week_check CHECK (
    recurrence_type != 'weekly' OR (days_of_week IS NOT NULL AND array_length(days_of_week, 1) > 0)
  ),
  CONSTRAINT aps_day_of_month_check CHECK (
    recurrence_type != 'monthly' OR (day_of_month IS NOT NULL AND day_of_month BETWEEN 1 AND 31)
  ),
  CONSTRAINT aps_cancelled_requires_timestamp CHECK (
    status != 'cancelled' OR cancelled_at IS NOT NULL
  )
);

COMMENT ON TABLE public.appointment_series IS
  'Recurring appointment series with bounded recurrence rules. Milestone 15.1.';

-- Indexes
CREATE INDEX idx_aps_tenant ON public.appointment_series (tenant_id, status, created_at DESC);
CREATE INDEX idx_aps_customer ON public.appointment_series (tenant_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_aps_service ON public.appointment_series (tenant_id, service_id);

CREATE TRIGGER trg_aps_updated_at
  BEFORE UPDATE ON public.appointment_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Add series reference to appointments
-- ============================================================

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS series_id UUID NULL REFERENCES public.appointment_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_occurrence_index INTEGER NULL,
  ADD COLUMN IF NOT EXISTS is_series_exception BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_appointments_series ON public.appointments (series_id, series_occurrence_index)
  WHERE series_id IS NOT NULL;

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.appointment_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aps_select_member"
  ON public.appointment_series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_series.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "aps_insert_owner_admin"
  ON public.appointment_series FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_series.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "aps_update_owner_admin"
  ON public.appointment_series FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_series.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );
