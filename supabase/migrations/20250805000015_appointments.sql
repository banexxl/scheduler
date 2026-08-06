-- Migration: Appointments Foundation (Milestone 6.9)
-- Introduces the appointments table, appointment number sequences,
-- conflict exclusion constraint, relationship verification trigger,
-- status transition trigger, interval consistency trigger, RLS policies,
-- and the insert_appointment_atomic RPC.

-- ============================================================
-- PART A: Extensions
-- ============================================================

-- Required for GiST exclusion constraint with uuid/timestamptz
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- PART B: Appointment Number Sequences
-- ============================================================

CREATE TABLE public.appointment_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_value bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

COMMENT ON TABLE public.appointment_sequences IS
  'Tenant-scoped atomic counter for generating unique appointment numbers.';

ALTER TABLE public.appointment_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apptseq_select_member"
  ON public.appointment_sequences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_sequences.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "apptseq_insert_owner_admin"
  ON public.appointment_sequences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_sequences.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "apptseq_update_owner_admin"
  ON public.appointment_sequences FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_sequences.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART C: Generate Appointment Number Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_appointment_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_val bigint;
  v_year text;
BEGIN
  -- Upsert sequence row and atomically increment
  INSERT INTO public.appointment_sequences (tenant_id, current_value)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    current_value = appointment_sequences.current_value + 1,
    updated_at = now()
  RETURNING current_value INTO v_next_val;

  v_year := extract(year FROM now())::text;

  RETURN 'APT-' || v_year || '-' || lpad(v_next_val::text, 6, '0');
END;
$$;

COMMENT ON FUNCTION public.generate_appointment_number IS
  'Generates a tenant-scoped human-readable appointment number (APT-YYYY-NNNNNN).';

-- ============================================================
-- PART D: Appointments Table
-- ============================================================

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_number text NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE RESTRICT,
  customer_id uuid NULL,
  customer_name text NOT NULL,
  customer_email text NULL,
  customer_phone text NULL,
  status text NOT NULL DEFAULT 'confirmed',
  source text NOT NULL DEFAULT 'internal',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  occupied_starts_at timestamptz NOT NULL,
  occupied_ends_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL,
  service_name_snapshot text NOT NULL,
  location_name_snapshot text NOT NULL,
  resource_name_snapshot text NOT NULL,
  internal_notes text NULL,
  customer_notes text NULL,
  cancelled_at timestamptz NULL,
  cancelled_by uuid NULL,
  cancellation_reason text NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.appointments IS
  'Persistent appointments for internal tenant users. Milestone 6.9.';

-- ============================================================
-- PART E: Unique Constraint on Appointment Number
-- ============================================================

ALTER TABLE public.appointments
  ADD CONSTRAINT appt_unique_number UNIQUE (tenant_id, appointment_number);

-- ============================================================
-- PART F: Check Constraints
-- ============================================================

-- Status values
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_status_check CHECK (
    status IN ('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')
  );

-- Source values
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_source_check CHECK (
    source IN ('internal', 'online', 'walk_in', 'phone')
  );

-- Time ordering
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_starts_before_ends CHECK (starts_at < ends_at),
  ADD CONSTRAINT appt_occupied_starts_lte_starts CHECK (occupied_starts_at <= starts_at),
  ADD CONSTRAINT appt_occupied_ends_gte_ends CHECK (occupied_ends_at >= ends_at),
  ADD CONSTRAINT appt_occupied_start_before_end CHECK (occupied_starts_at < occupied_ends_at);

-- Duration and buffer ranges
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_duration_range CHECK (duration_minutes BETWEEN 5 AND 1440),
  ADD CONSTRAINT appt_buffer_before_range CHECK (buffer_before_minutes BETWEEN 0 AND 1440),
  ADD CONSTRAINT appt_buffer_after_range CHECK (buffer_after_minutes BETWEEN 0 AND 1440);

-- Price
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_price_non_negative CHECK (price >= 0);

-- Currency format (3 uppercase letters)
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_currency_format CHECK (currency ~ '^[A-Z]{3}$');

-- Customer name length
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_customer_name_length CHECK (
    char_length(trim(customer_name)) BETWEEN 1 AND 160
  );

-- Customer email basic format and length
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_customer_email_check CHECK (
    customer_email IS NULL
    OR (char_length(customer_email) BETWEEN 5 AND 254
        AND customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

-- Customer phone length
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_customer_phone_length CHECK (
    customer_phone IS NULL OR char_length(customer_phone) BETWEEN 3 AND 30
  );

-- Notes max lengths
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_internal_notes_max CHECK (
    internal_notes IS NULL OR char_length(internal_notes) <= 5000
  ),
  ADD CONSTRAINT appt_customer_notes_max CHECK (
    customer_notes IS NULL OR char_length(customer_notes) <= 2000
  ),
  ADD CONSTRAINT appt_cancellation_reason_max CHECK (
    cancellation_reason IS NULL OR char_length(cancellation_reason) <= 1000
  );

-- Cancellation metadata: cancelled status must have cancelled_at
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_cancelled_requires_timestamp CHECK (
    status <> 'cancelled' OR cancelled_at IS NOT NULL
  );

-- Non-cancelled appointments should not have cancellation metadata
ALTER TABLE public.appointments
  ADD CONSTRAINT appt_non_cancelled_no_cancel_data CHECK (
    status = 'cancelled'
    OR (cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
  );

-- ============================================================
-- PART G: Interval Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_appointment_intervals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_duration_check interval;
  v_buffer_before_check interval;
  v_buffer_after_check interval;
BEGIN
  -- Verify duration_minutes matches starts_at/ends_at
  v_duration_check := NEW.ends_at - NEW.starts_at;
  IF extract(epoch FROM v_duration_check) / 60 <> NEW.duration_minutes THEN
    RAISE EXCEPTION 'duration_minutes (%) does not match ends_at - starts_at (%)',
      NEW.duration_minutes, extract(epoch FROM v_duration_check) / 60;
  END IF;

  -- Verify buffer_before matches occupied_starts_at/starts_at
  v_buffer_before_check := NEW.starts_at - NEW.occupied_starts_at;
  IF extract(epoch FROM v_buffer_before_check) / 60 <> NEW.buffer_before_minutes THEN
    RAISE EXCEPTION 'buffer_before_minutes (%) does not match starts_at - occupied_starts_at (%)',
      NEW.buffer_before_minutes, extract(epoch FROM v_buffer_before_check) / 60;
  END IF;

  -- Verify buffer_after matches ends_at/occupied_ends_at
  v_buffer_after_check := NEW.occupied_ends_at - NEW.ends_at;
  IF extract(epoch FROM v_buffer_after_check) / 60 <> NEW.buffer_after_minutes THEN
    RAISE EXCEPTION 'buffer_after_minutes (%) does not match occupied_ends_at - ends_at (%)',
      NEW.buffer_after_minutes, extract(epoch FROM v_buffer_after_check) / 60;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_appointment_intervals
  BEFORE INSERT OR UPDATE OF starts_at, ends_at, occupied_starts_at, occupied_ends_at,
    duration_minutes, buffer_before_minutes, buffer_after_minutes
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_intervals();

-- ============================================================
-- PART H: Status Transition Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_appointment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal statuses cannot change
  IF OLD.status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', OLD.status;
  END IF;

  -- Validate allowed transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status;
      END IF;
    WHEN 'confirmed' THEN
      IF NEW.status NOT IN ('checked_in', 'in_progress', 'completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid transition from confirmed to %', NEW.status;
      END IF;
    WHEN 'checked_in' THEN
      IF NEW.status NOT IN ('in_progress', 'completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid transition from checked_in to %', NEW.status;
      END IF;
    WHEN 'in_progress' THEN
      IF NEW.status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from in_progress to %', NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown appointment status: %', OLD.status;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_appointment_status_transition
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_status_transition();

-- ============================================================
-- PART I: Relationship Verification Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_appointment_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only verify on insert or when relevant FKs/time change
  -- For status-only updates, skip (allows historical records)
  IF TG_OP = 'UPDATE' AND
     OLD.service_id = NEW.service_id AND
     OLD.location_id = NEW.location_id AND
     OLD.resource_id = NEW.resource_id AND
     OLD.starts_at = NEW.starts_at AND
     OLD.ends_at = NEW.ends_at THEN
    RETURN NEW;
  END IF;

  -- Service belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to this tenant';
  END IF;

  -- Location belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = NEW.location_id AND l.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Location does not belong to this tenant';
  END IF;

  -- Resource belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = NEW.resource_id AND r.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to this tenant';
  END IF;

  -- Service-location assignment exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.service_locations sl
    WHERE sl.service_id = NEW.service_id
      AND sl.location_id = NEW.location_id
      AND sl.tenant_id = NEW.tenant_id
      AND sl.is_active = true
  ) THEN
    RAISE EXCEPTION 'Service is not actively assigned to this location';
  END IF;

  -- Service-resource assignment exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.service_resources sr
    WHERE sr.service_id = NEW.service_id
      AND sr.resource_id = NEW.resource_id
      AND sr.tenant_id = NEW.tenant_id
      AND sr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Resource is not actively assigned to this service';
  END IF;

  -- Resource-location assignment exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.resource_locations rl
    WHERE rl.resource_id = NEW.resource_id
      AND rl.location_id = NEW.location_id
      AND rl.tenant_id = NEW.tenant_id
      AND rl.is_active = true
  ) THEN
    RAISE EXCEPTION 'Resource is not actively assigned to this location';
  END IF;

  -- Customer belongs to tenant (if provided)
  -- Note: customer_id is nullable; skip check when NULL
  -- No customers table yet — this check is deferred until customer table exists.

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_appointment_relationships
  BEFORE INSERT OR UPDATE OF service_id, location_id, resource_id, tenant_id, starts_at, ends_at
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_relationships();

-- ============================================================
-- PART J: Conflict Exclusion Constraint
-- ============================================================

-- Prevents overlapping non-cancelled appointments for the same resource.
-- Uses half-open interval semantics [occupied_starts_at, occupied_ends_at).
-- Adjacent appointments (10:00-11:00, 11:00-12:00) are valid.

ALTER TABLE public.appointments
  ADD CONSTRAINT appt_resource_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    resource_id WITH =,
    tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&
  )
  WHERE (status <> 'cancelled');

-- ============================================================
-- PART K: Indexes
-- ============================================================

CREATE INDEX idx_appt_tenant_starts ON public.appointments (tenant_id, starts_at);
CREATE INDEX idx_appt_tenant_resource_starts ON public.appointments (tenant_id, resource_id, starts_at);
CREATE INDEX idx_appt_tenant_resource_occupied ON public.appointments (tenant_id, resource_id, occupied_starts_at);
CREATE INDEX idx_appt_tenant_status_starts ON public.appointments (tenant_id, status, starts_at);
CREATE INDEX idx_appt_tenant_location ON public.appointments (tenant_id, location_id, starts_at);
CREATE INDEX idx_appt_tenant_service ON public.appointments (tenant_id, service_id, starts_at);
CREATE INDEX idx_appt_tenant_customer ON public.appointments (tenant_id, customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_appt_tenant_number ON public.appointments (tenant_id, appointment_number);

-- ============================================================
-- PART L: Updated-At Trigger
-- ============================================================

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART M: RLS Policies
-- ============================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_select_member"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointments.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "appt_insert_owner_admin"
  ON public.appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointments.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "appt_update_owner_admin"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointments.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "appt_delete_owner_admin"
  ON public.appointments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointments.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART N: Insert Appointment Atomic RPC
-- ============================================================

-- This function performs the atomic appointment insert with:
-- 1. Appointment number generation
-- 2. Relationship revalidation (via trigger)
-- 3. Interval consistency validation (via trigger)
-- 4. Conflict detection (via exclusion constraint)
-- Returns the full appointment row on success.

CREATE OR REPLACE FUNCTION public.insert_appointment_atomic(
  p_tenant_id uuid,
  p_service_id uuid,
  p_location_id uuid,
  p_resource_id uuid,
  p_customer_id uuid DEFAULT NULL,
  p_customer_name text DEFAULT '',
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_status text DEFAULT 'confirmed',
  p_source text DEFAULT 'internal',
  p_starts_at timestamptz DEFAULT NULL,
  p_ends_at timestamptz DEFAULT NULL,
  p_occupied_starts_at timestamptz DEFAULT NULL,
  p_occupied_ends_at timestamptz DEFAULT NULL,
  p_duration_minutes integer DEFAULT 0,
  p_buffer_before_minutes integer DEFAULT 0,
  p_buffer_after_minutes integer DEFAULT 0,
  p_price numeric DEFAULT 0,
  p_currency text DEFAULT 'USD',
  p_service_name_snapshot text DEFAULT '',
  p_location_name_snapshot text DEFAULT '',
  p_resource_name_snapshot text DEFAULT '',
  p_internal_notes text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment_number text;
  v_result public.appointments;
BEGIN
  -- Generate appointment number atomically
  v_appointment_number := public.generate_appointment_number(p_tenant_id);

  -- Insert the appointment (triggers handle validation)
  INSERT INTO public.appointments (
    tenant_id, appointment_number, service_id, location_id, resource_id,
    customer_id, customer_name, customer_email, customer_phone,
    status, source, starts_at, ends_at,
    occupied_starts_at, occupied_ends_at,
    duration_minutes, buffer_before_minutes, buffer_after_minutes,
    price, currency,
    service_name_snapshot, location_name_snapshot, resource_name_snapshot,
    internal_notes, customer_notes, created_by, updated_by
  ) VALUES (
    p_tenant_id, v_appointment_number, p_service_id, p_location_id, p_resource_id,
    p_customer_id, p_customer_name, p_customer_email, p_customer_phone,
    p_status, p_source, p_starts_at, p_ends_at,
    p_occupied_starts_at, p_occupied_ends_at,
    p_duration_minutes, p_buffer_before_minutes, p_buffer_after_minutes,
    p_price, p_currency,
    p_service_name_snapshot, p_location_name_snapshot, p_resource_name_snapshot,
    p_internal_notes, p_customer_notes, p_created_by, p_created_by
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.insert_appointment_atomic IS
  'Atomically creates an appointment with generated number, relationship validation, interval checks, and conflict protection.';

-- ============================================================
-- PART O: Cancel Appointment RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_appointment(
  p_appointment_id uuid,
  p_tenant_id uuid,
  p_cancelled_by uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.appointments;
  v_current_status text;
BEGIN
  -- Load current status
  SELECT status INTO v_current_status
  FROM public.appointments
  WHERE id = p_appointment_id AND tenant_id = p_tenant_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  -- Check if cancellable (not already terminal)
  IF v_current_status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Cannot cancel appointment with status: %', v_current_status;
  END IF;

  -- Perform cancellation
  UPDATE public.appointments
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = p_cancelled_by,
    cancellation_reason = p_reason,
    updated_by = p_cancelled_by
  WHERE id = p_appointment_id AND tenant_id = p_tenant_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.cancel_appointment IS
  'Cancels an appointment atomically, setting status, timestamp, and reason.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
