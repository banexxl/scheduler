-- Migration: Appointment operational metadata and status history
-- Adds operational timestamps and an append-only transition history table
-- for the appointment operations workflow.

CREATE TABLE IF NOT EXISTS public.appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_status_history_select_member"
  ON public.appointment_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_status_history.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "appt_status_history_insert_owner_admin"
  ON public.appointment_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_status_history.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_appt_status_history_appointment
  ON public.appointment_status_history (tenant_id, appointment_id, changed_at);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS service_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz NULL;

CREATE OR REPLACE FUNCTION public.transition_appointment_status(
  p_appointment_id uuid,
  p_tenant_id uuid,
  p_target_status text,
  p_updated_by uuid DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
  v_current_record public.appointments;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_current_record
  FROM public.appointments
  WHERE id = p_appointment_id AND tenant_id = p_tenant_id;

  IF v_current_record.id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  v_current_status := v_current_record.status;

  IF v_current_status = p_target_status THEN
    RAISE EXCEPTION 'Status is already the target status';
  END IF;

  IF v_current_status IN ('completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', v_current_status;
  END IF;

  CASE v_current_status
    WHEN 'pending' THEN
      IF p_target_status NOT IN ('confirmed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from pending to %', p_target_status;
      END IF;
    WHEN 'confirmed' THEN
      IF p_target_status NOT IN ('checked_in', 'in_progress', 'completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid transition from confirmed to %', p_target_status;
      END IF;
    WHEN 'checked_in' THEN
      IF p_target_status NOT IN ('in_progress', 'completed', 'cancelled', 'no_show') THEN
        RAISE EXCEPTION 'Invalid transition from checked_in to %', p_target_status;
      END IF;
    WHEN 'in_progress' THEN
      IF p_target_status NOT IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from in_progress to %', p_target_status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Unknown appointment status: %', v_current_status;
  END CASE;

  UPDATE public.appointments
  SET
    status = p_target_status,
    updated_by = p_updated_by,
    checked_in_at = CASE
      WHEN p_target_status = 'checked_in' AND (v_current_record.checked_in_at IS NULL OR v_current_record.status <> 'checked_in') THEN v_now
      ELSE v_current_record.checked_in_at
    END,
    service_started_at = CASE
      WHEN p_target_status = 'in_progress' AND (v_current_record.service_started_at IS NULL OR v_current_record.status <> 'in_progress') THEN v_now
      ELSE v_current_record.service_started_at
    END,
    completed_at = CASE
      WHEN p_target_status = 'completed' AND (v_current_record.completed_at IS NULL OR v_current_record.status <> 'completed') THEN v_now
      ELSE v_current_record.completed_at
    END,
    no_show_at = CASE
      WHEN p_target_status = 'no_show' AND (v_current_record.no_show_at IS NULL OR v_current_record.status <> 'no_show') THEN v_now
      ELSE v_current_record.no_show_at
    END,
    cancelled_at = CASE
      WHEN p_target_status = 'cancelled' AND v_current_record.cancelled_at IS NULL THEN v_now
      ELSE v_current_record.cancelled_at
    END,
    cancelled_by = CASE
      WHEN p_target_status = 'cancelled' AND v_current_record.cancelled_by IS NULL THEN p_updated_by
      ELSE v_current_record.cancelled_by
    END,
    cancellation_reason = CASE
      WHEN p_target_status = 'cancelled' AND v_current_record.cancellation_reason IS NULL THEN NULL
      ELSE v_current_record.cancellation_reason
    END
  WHERE id = p_appointment_id AND tenant_id = p_tenant_id
  RETURNING * INTO v_current_record;

  INSERT INTO public.appointment_status_history (
    tenant_id,
    appointment_id,
    from_status,
    to_status,
    changed_at,
    changed_by
  ) VALUES (
    p_tenant_id,
    p_appointment_id,
    v_current_status,
    p_target_status,
    v_now,
    p_updated_by
  );

  RETURN v_current_record;
END;
$$;

COMMENT ON FUNCTION public.transition_appointment_status IS
  'Transitions an appointment status while recording operational timestamps and history.';
