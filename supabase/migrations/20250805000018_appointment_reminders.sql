-- Migration: Appointment Reminders (Milestone 6.13)
-- Introduces tenant reminder rules, appointment reminder schedules,
-- schedule_version on appointments, extends notification event types,
-- and provides RPCs for synchronization, claiming, and backfill.

-- ============================================================
-- PART A: Add schedule_version to appointments
-- ============================================================

ALTER TABLE public.appointments
  ADD COLUMN schedule_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.appointments
  ADD CONSTRAINT appt_schedule_version_positive CHECK (schedule_version >= 1);

COMMENT ON COLUMN public.appointments.schedule_version IS
  'Incremented on each scheduling change (time/service/resource/location). Used for reminder identity.';

-- ============================================================
-- PART B: Tenant Reminder Rules
-- ============================================================

CREATE TABLE public.tenant_reminder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  offset_minutes integer NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel, offset_minutes)
);

COMMENT ON TABLE public.tenant_reminder_rules IS
  'Per-tenant configurable reminder rules. Each rule defines an offset before appointment start. Milestone 6.13.';

-- Constraints
ALTER TABLE public.tenant_reminder_rules
  ADD CONSTRAINT trr_name_length CHECK (
    char_length(trim(name)) BETWEEN 1 AND 120
  ),
  ADD CONSTRAINT trr_offset_min CHECK (offset_minutes >= 5),
  ADD CONSTRAINT trr_offset_max CHECK (offset_minutes <= 525600),
  ADD CONSTRAINT trr_channel_check CHECK (channel IN ('email')),
  ADD CONSTRAINT trr_sort_order_non_negative CHECK (sort_order >= 0);

-- Indexes
CREATE INDEX idx_trr_tenant ON public.tenant_reminder_rules (tenant_id);
CREATE INDEX idx_trr_tenant_active ON public.tenant_reminder_rules (tenant_id, is_active);
CREATE INDEX idx_trr_tenant_sort ON public.tenant_reminder_rules (tenant_id, sort_order);

-- Updated-at trigger
CREATE TRIGGER trg_trr_updated_at
  BEFORE UPDATE ON public.tenant_reminder_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.tenant_reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trr_select_member"
  ON public.tenant_reminder_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_reminder_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "trr_insert_owner_admin"
  ON public.tenant_reminder_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_reminder_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "trr_update_owner_admin"
  ON public.tenant_reminder_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_reminder_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "trr_delete_owner_admin"
  ON public.tenant_reminder_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_reminder_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART C: Appointment Reminders Table
-- ============================================================

CREATE TABLE public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_rule_id uuid NOT NULL REFERENCES public.tenant_reminder_rules(id) ON DELETE RESTRICT,
  schedule_version integer NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  outbox_id uuid NULL REFERENCES public.notification_outbox(id) ON DELETE SET NULL,
  claimed_at timestamptz NULL,
  claimed_by text NULL,
  enqueued_at timestamptz NULL,
  sent_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  cancellation_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, appointment_id, reminder_rule_id, schedule_version)
);

COMMENT ON TABLE public.appointment_reminders IS
  'Persistent reminder schedule records for appointments. One per appointment+rule+version. Milestone 6.13.';

-- Constraints
ALTER TABLE public.appointment_reminders
  ADD CONSTRAINT ar_channel_check CHECK (channel IN ('email')),
  ADD CONSTRAINT ar_status_check CHECK (
    status IN ('pending', 'processing', 'enqueued', 'sent', 'cancelled', 'failed')
  ),
  ADD CONSTRAINT ar_cancellation_reason_max CHECK (
    cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500
  ),
  ADD CONSTRAINT ar_sent_requires_sent_at CHECK (
    status <> 'sent' OR sent_at IS NOT NULL
  ),
  ADD CONSTRAINT ar_cancelled_requires_cancelled_at CHECK (
    status <> 'cancelled' OR cancelled_at IS NOT NULL
  ),
  ADD CONSTRAINT ar_enqueued_requires_outbox CHECK (
    status NOT IN ('enqueued', 'sent') OR outbox_id IS NOT NULL
  ),
  ADD CONSTRAINT ar_schedule_version_positive CHECK (schedule_version >= 1);

-- Indexes
CREATE INDEX idx_ar_tenant ON public.appointment_reminders (tenant_id);
CREATE INDEX idx_ar_appointment ON public.appointment_reminders (appointment_id);
CREATE INDEX idx_ar_rule ON public.appointment_reminders (reminder_rule_id);
CREATE INDEX idx_ar_status_scheduled ON public.appointment_reminders (status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_ar_tenant_status_scheduled ON public.appointment_reminders (tenant_id, status, scheduled_for);
CREATE INDEX idx_ar_tenant_appt_version ON public.appointment_reminders (tenant_id, appointment_id, schedule_version);
CREATE INDEX idx_ar_outbox ON public.appointment_reminders (outbox_id) WHERE outbox_id IS NOT NULL;
CREATE INDEX idx_ar_claimed ON public.appointment_reminders (claimed_at) WHERE claimed_at IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER trg_ar_updated_at
  BEFORE UPDATE ON public.appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_select_owner_admin"
  ON public.appointment_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_reminders.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- No direct client INSERT/UPDATE/DELETE — managed via RPCs

-- ============================================================
-- PART D: Tenant-Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_appointment_reminder_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_appt_tenant uuid;
  v_appt_status text;
  v_rule_tenant uuid;
  v_rule_channel text;
BEGIN
  -- Verify appointment belongs to tenant
  SELECT tenant_id, status INTO v_appt_tenant, v_appt_status
  FROM public.appointments
  WHERE id = NEW.appointment_id;

  IF v_appt_tenant IS NULL THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF v_appt_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Appointment does not belong to this tenant';
  END IF;

  -- Verify reminder rule belongs to tenant
  SELECT tenant_id, channel INTO v_rule_tenant, v_rule_channel
  FROM public.tenant_reminder_rules
  WHERE id = NEW.reminder_rule_id;

  IF v_rule_tenant IS NULL THEN
    RAISE EXCEPTION 'Reminder rule not found';
  END IF;

  IF v_rule_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Reminder rule does not belong to this tenant';
  END IF;

  -- Verify channel consistency
  IF v_rule_channel <> NEW.channel THEN
    RAISE EXCEPTION 'Reminder channel does not match rule channel';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_appointment_reminder_relationships
  BEFORE INSERT OR UPDATE OF tenant_id, appointment_id, reminder_rule_id, channel
  ON public.appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_reminder_relationships();

-- ============================================================
-- PART E: Extend Notification Event/Template Types
-- ============================================================

-- Update notification_outbox event_type constraint
ALTER TABLE public.notification_outbox DROP CONSTRAINT no_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_event_type_check CHECK (
    event_type IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled', 'appointment_reminder')
  );

-- Update notification_outbox template_type constraint
ALTER TABLE public.notification_outbox DROP CONSTRAINT no_template_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_template_type_check CHECK (
    template_type IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled', 'appointment_reminder')
  );

-- Update notification_templates template_type constraint
ALTER TABLE public.notification_templates DROP CONSTRAINT nt_template_type_check;
ALTER TABLE public.notification_templates
  ADD CONSTRAINT nt_template_type_check CHECK (
    template_type IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled', 'appointment_reminder')
  );

-- ============================================================
-- PART F: Sync Appointment Reminders RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_appointment_reminders(
  p_tenant_id uuid,
  p_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appt record;
  v_rule record;
  v_scheduled_for timestamptz;
  v_created integer := 0;
  v_updated integer := 0;
  v_cancelled integer := 0;
  v_skipped integer := 0;
  v_eligible_statuses text[] := ARRAY['pending', 'confirmed'];
BEGIN
  -- Load appointment
  SELECT id, tenant_id, status, starts_at, customer_email, schedule_version
  INTO v_appt
  FROM public.appointments
  WHERE id = p_appointment_id AND tenant_id = p_tenant_id;

  IF v_appt IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'appointment_not_found');
  END IF;

  -- Check eligibility
  IF NOT (v_appt.status = ANY(v_eligible_statuses)) THEN
    -- Cancel all pending reminders for this appointment
    UPDATE public.appointment_reminders
    SET
      status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'appointment_ineligible'
    WHERE appointment_id = p_appointment_id
      AND tenant_id = p_tenant_id
      AND status IN ('pending', 'processing');

    GET DIAGNOSTICS v_cancelled = ROW_COUNT;

    RETURN jsonb_build_object(
      'status', 'ineligible',
      'cancelled', v_cancelled
    );
  END IF;

  -- Check email exists
  IF v_appt.customer_email IS NULL OR v_appt.customer_email = '' THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'no_customer_email');
  END IF;

  -- Cancel pending reminders from old schedule versions
  UPDATE public.appointment_reminders
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = 'schedule_version_superseded'
  WHERE appointment_id = p_appointment_id
    AND tenant_id = p_tenant_id
    AND schedule_version < v_appt.schedule_version
    AND status IN ('pending', 'processing');

  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Process each active rule
  FOR v_rule IN
    SELECT id, offset_minutes, channel
    FROM public.tenant_reminder_rules
    WHERE tenant_id = p_tenant_id AND is_active = true
    ORDER BY offset_minutes DESC
  LOOP
    v_scheduled_for := v_appt.starts_at - (v_rule.offset_minutes * interval '1 minute');

    -- Skip if scheduled time is in the past
    IF v_scheduled_for <= now() THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Insert or update reminder
    INSERT INTO public.appointment_reminders (
      tenant_id, appointment_id, reminder_rule_id, schedule_version,
      channel, scheduled_for, status
    ) VALUES (
      p_tenant_id, p_appointment_id, v_rule.id, v_appt.schedule_version,
      v_rule.channel, v_scheduled_for, 'pending'
    )
    ON CONFLICT (tenant_id, appointment_id, reminder_rule_id, schedule_version)
    DO UPDATE SET
      scheduled_for = EXCLUDED.scheduled_for
    WHERE appointment_reminders.status = 'pending';

    IF FOUND THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- Cancel pending reminders for rules that are no longer active
  UPDATE public.appointment_reminders
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = 'rule_deactivated'
  WHERE appointment_id = p_appointment_id
    AND tenant_id = p_tenant_id
    AND schedule_version = v_appt.schedule_version
    AND status IN ('pending', 'processing')
    AND reminder_rule_id NOT IN (
      SELECT id FROM public.tenant_reminder_rules
      WHERE tenant_id = p_tenant_id AND is_active = true
    );

  RETURN jsonb_build_object(
    'status', 'synced',
    'created_or_updated', v_created,
    'cancelled', v_cancelled,
    'skipped_past', v_skipped,
    'schedule_version', v_appt.schedule_version
  );
END;
$$;

COMMENT ON FUNCTION public.sync_appointment_reminders IS
  'Synchronizes appointment reminders with current rules and schedule. Creates/updates/cancels as needed. SECURITY DEFINER.';

-- ============================================================
-- PART G: Claim Due Appointment Reminders RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_due_appointment_reminders(
  p_worker_id text,
  p_batch_size integer DEFAULT 10
)
RETURNS SETOF public.appointment_reminders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_eligible_statuses text[] := ARRAY['pending', 'confirmed'];
BEGIN
  -- Enforce maximum batch size
  IF p_batch_size > 50 THEN
    p_batch_size := 50;
  END IF;

  -- Recover stale processing locks (> 10 minutes)
  UPDATE public.appointment_reminders
  SET
    status = 'pending',
    claimed_at = NULL,
    claimed_by = NULL
  WHERE status = 'processing'
    AND claimed_at < now() - interval '10 minutes';

  -- Claim due pending reminders
  RETURN QUERY
  UPDATE public.appointment_reminders ar
  SET
    status = 'processing',
    claimed_at = now(),
    claimed_by = p_worker_id
  WHERE ar.id IN (
    SELECT ar2.id
    FROM public.appointment_reminders ar2
    INNER JOIN public.appointments a ON a.id = ar2.appointment_id
    WHERE ar2.status = 'pending'
      AND ar2.scheduled_for <= now()
      AND a.status = ANY(v_eligible_statuses)
      AND a.customer_email IS NOT NULL
      AND a.customer_email <> ''
      AND a.schedule_version = ar2.schedule_version
    ORDER BY ar2.scheduled_for ASC
    FOR UPDATE OF ar2 SKIP LOCKED
    LIMIT p_batch_size
  )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.claim_due_appointment_reminders IS
  'Claims a batch of due pending reminders for processing. Verifies appointment eligibility. Uses SKIP LOCKED.';

-- ============================================================
-- PART H: Cancel Pending Appointment Reminder Notifications RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_pending_appointment_reminder_notifications(
  p_tenant_id uuid,
  p_appointment_id uuid,
  p_reason text DEFAULT 'appointment_changed'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_reminders integer := 0;
  v_outbox_ids uuid[];
BEGIN
  -- Collect outbox IDs from pending/processing reminders
  SELECT array_agg(outbox_id)
  INTO v_outbox_ids
  FROM public.appointment_reminders
  WHERE tenant_id = p_tenant_id
    AND appointment_id = p_appointment_id
    AND status IN ('pending', 'processing', 'enqueued')
    AND outbox_id IS NOT NULL;

  -- Cancel reminder records
  UPDATE public.appointment_reminders
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    claimed_at = NULL,
    claimed_by = NULL
  WHERE tenant_id = p_tenant_id
    AND appointment_id = p_appointment_id
    AND status IN ('pending', 'processing', 'enqueued');

  GET DIAGNOSTICS v_cancelled_reminders = ROW_COUNT;

  -- Cancel linked outbox rows that are still pending
  IF v_outbox_ids IS NOT NULL AND array_length(v_outbox_ids, 1) > 0 THEN
    UPDATE public.notification_outbox
    SET
      status = 'cancelled',
      locked_at = NULL,
      locked_by = NULL
    WHERE id = ANY(v_outbox_ids)
      AND status IN ('pending', 'processing');
  END IF;

  RETURN v_cancelled_reminders;
END;
$$;

COMMENT ON FUNCTION public.cancel_pending_appointment_reminder_notifications IS
  'Cancels pending reminder schedules and their linked outbox rows. Used during cancellation/rescheduling.';

-- ============================================================
-- PART I: Backfill Appointment Reminders RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.backfill_appointment_reminders(
  p_tenant_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_batch_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appt record;
  v_processed integer := 0;
  v_eligible_statuses text[] := ARRAY['pending', 'confirmed'];
BEGIN
  -- Enforce bounds
  IF p_batch_limit > 500 THEN
    p_batch_limit := 500;
  END IF;

  -- Enforce maximum range (90 days)
  IF p_end_at - p_start_at > interval '90 days' THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'range_exceeds_90_days');
  END IF;

  -- Only process future appointments
  IF p_start_at < now() THEN
    p_start_at := now();
  END IF;

  FOR v_appt IN
    SELECT id
    FROM public.appointments
    WHERE tenant_id = p_tenant_id
      AND starts_at >= p_start_at
      AND starts_at <= p_end_at
      AND status = ANY(v_eligible_statuses)
      AND customer_email IS NOT NULL
      AND customer_email <> ''
    ORDER BY starts_at ASC
    LIMIT p_batch_limit
  LOOP
    PERFORM public.sync_appointment_reminders(p_tenant_id, v_appt.id);
    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'completed',
    'processed', v_processed
  );
END;
$$;

COMMENT ON FUNCTION public.backfill_appointment_reminders IS
  'Creates reminder schedules for existing future appointments within a date range. Max 90 days, max 500 per batch.';

-- ============================================================
-- PART J: Increment Schedule Version Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_appointment_schedule_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only increment when scheduling fields change
  IF OLD.starts_at IS DISTINCT FROM NEW.starts_at
    OR OLD.ends_at IS DISTINCT FROM NEW.ends_at
    OR OLD.service_id IS DISTINCT FROM NEW.service_id
    OR OLD.location_id IS DISTINCT FROM NEW.location_id
    OR OLD.resource_id IS DISTINCT FROM NEW.resource_id
    OR OLD.duration_minutes IS DISTINCT FROM NEW.duration_minutes
    OR OLD.buffer_before_minutes IS DISTINCT FROM NEW.buffer_before_minutes
    OR OLD.buffer_after_minutes IS DISTINCT FROM NEW.buffer_after_minutes
  THEN
    NEW.schedule_version := OLD.schedule_version + 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_schedule_version
  BEFORE UPDATE OF starts_at, ends_at, service_id, location_id, resource_id,
    duration_minutes, buffer_before_minutes, buffer_after_minutes
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.increment_appointment_schedule_version();

COMMENT ON FUNCTION public.increment_appointment_schedule_version IS
  'Auto-increments schedule_version when scheduling fields change on an appointment.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
