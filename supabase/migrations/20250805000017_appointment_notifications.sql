-- Migration: Appointment Notifications Foundation (Milestone 6.12)
-- Introduces tenant notification settings, notification templates,
-- notification outbox (transactional outbox pattern), and delivery tracking.

-- ============================================================
-- PART A: Tenant Notification Settings
-- ============================================================

CREATE TABLE public.tenant_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  send_booking_confirmation boolean NOT NULL DEFAULT true,
  send_reschedule_confirmation boolean NOT NULL DEFAULT true,
  send_cancellation_confirmation boolean NOT NULL DEFAULT true,
  reply_to_email text NULL,
  sender_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

COMMENT ON TABLE public.tenant_notification_settings IS
  'Per-tenant email notification preferences. One row per tenant. Milestone 6.12.';

-- Constraints
ALTER TABLE public.tenant_notification_settings
  ADD CONSTRAINT tns_sender_name_length CHECK (
    sender_name IS NULL OR char_length(trim(sender_name)) BETWEEN 1 AND 120
  ),
  ADD CONSTRAINT tns_reply_to_email_max CHECK (
    reply_to_email IS NULL OR char_length(reply_to_email) <= 320
  ),
  ADD CONSTRAINT tns_reply_to_email_format CHECK (
    reply_to_email IS NULL
    OR (reply_to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

-- Index
CREATE INDEX idx_tns_tenant ON public.tenant_notification_settings (tenant_id);

-- Updated-at trigger
CREATE TRIGGER trg_tns_updated_at
  BEFORE UPDATE ON public.tenant_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.tenant_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tns_select_member"
  ON public.tenant_notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_notification_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "tns_insert_owner_admin"
  ON public.tenant_notification_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_notification_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tns_update_owner_admin"
  ON public.tenant_notification_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_notification_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tns_delete_owner_admin"
  ON public.tenant_notification_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_notification_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART B: Notification Templates
-- ============================================================

CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_type)
);

COMMENT ON TABLE public.notification_templates IS
  'Per-tenant notification email templates for appointment events. Milestone 6.12.';

-- Constraints
ALTER TABLE public.notification_templates
  ADD CONSTRAINT nt_template_type_check CHECK (
    template_type IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled')
  ),
  ADD CONSTRAINT nt_subject_length CHECK (
    char_length(trim(subject_template)) BETWEEN 1 AND 200
  ),
  ADD CONSTRAINT nt_body_max CHECK (
    char_length(body_template) <= 20000
  );

-- Indexes
CREATE INDEX idx_nt_tenant ON public.notification_templates (tenant_id);
CREATE INDEX idx_nt_tenant_type ON public.notification_templates (tenant_id, template_type);
CREATE INDEX idx_nt_tenant_active ON public.notification_templates (tenant_id, is_active);

-- Updated-at trigger
CREATE TRIGGER trg_nt_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nt_select_member"
  ON public.notification_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = notification_templates.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "nt_insert_owner_admin"
  ON public.notification_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = notification_templates.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "nt_update_owner_admin"
  ON public.notification_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = notification_templates.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "nt_delete_owner_admin"
  ON public.notification_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = notification_templates.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART C: Notification Outbox
-- ============================================================

CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  recipient_email text NOT NULL,
  template_type text NOT NULL,
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz NULL,
  locked_by text NULL,
  processed_at timestamptz NULL,
  last_error_code text NULL,
  last_error_message text NULL,
  rendered_subject text NULL,
  rendered_html text NULL,
  rendered_text text NULL,
  sender_name text NULL,
  reply_to_email text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

COMMENT ON TABLE public.notification_outbox IS
  'Transactional outbox for appointment email notifications. Milestone 6.12.';

-- Constraints
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_event_type_check CHECK (
    event_type IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled')
  ),
  ADD CONSTRAINT no_channel_check CHECK (
    channel IN ('email')
  ),
  ADD CONSTRAINT no_status_check CHECK (
    status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')
  ),
  ADD CONSTRAINT no_template_type_check CHECK (
    template_type IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled')
  ),
  ADD CONSTRAINT no_recipient_email_check CHECK (
    char_length(recipient_email) BETWEEN 5 AND 320
    AND recipient_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  ADD CONSTRAINT no_attempt_count_non_negative CHECK (
    attempt_count >= 0
  ),
  ADD CONSTRAINT no_payload_is_object CHECK (
    jsonb_typeof(payload) = 'object'
  ),
  ADD CONSTRAINT no_sent_requires_processed_at CHECK (
    status <> 'sent' OR processed_at IS NOT NULL
  ),
  ADD CONSTRAINT no_pending_requires_next_attempt CHECK (
    status <> 'pending' OR next_attempt_at IS NOT NULL
  ),
  ADD CONSTRAINT no_error_code_max CHECK (
    last_error_code IS NULL OR char_length(last_error_code) <= 100
  ),
  ADD CONSTRAINT no_error_message_max CHECK (
    last_error_message IS NULL OR char_length(last_error_message) <= 2000
  ),
  ADD CONSTRAINT no_rendered_subject_max CHECK (
    rendered_subject IS NULL OR char_length(rendered_subject) <= 500
  ),
  ADD CONSTRAINT no_rendered_html_max CHECK (
    rendered_html IS NULL OR char_length(rendered_html) <= 100000
  ),
  ADD CONSTRAINT no_rendered_text_max CHECK (
    rendered_text IS NULL OR char_length(rendered_text) <= 50000
  );

-- Indexes
CREATE INDEX idx_no_tenant ON public.notification_outbox (tenant_id);
CREATE INDEX idx_no_appointment ON public.notification_outbox (appointment_id);
CREATE INDEX idx_no_status_next_attempt ON public.notification_outbox (status, next_attempt_at);
CREATE INDEX idx_no_tenant_status_created ON public.notification_outbox (tenant_id, status, created_at);
CREATE INDEX idx_no_tenant_appointment_created ON public.notification_outbox (tenant_id, appointment_id, created_at);
CREATE INDEX idx_no_locked_at ON public.notification_outbox (locked_at);

-- Updated-at trigger
CREATE TRIGGER trg_no_updated_at
  BEFORE UPDATE ON public.notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Only owners/admins can read outbox for diagnostics
CREATE POLICY "no_select_owner_admin"
  ON public.notification_outbox FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = notification_outbox.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- No direct client insert/update/delete — managed via RPCs
-- (No INSERT/UPDATE/DELETE policies for regular users)

-- ============================================================
-- PART D: Notification Deliveries
-- ============================================================

CREATE TABLE public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  outbox_id uuid NOT NULL REFERENCES public.notification_outbox(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_message_id text NULL,
  attempt_number integer NOT NULL,
  status text NOT NULL,
  error_code text NULL,
  error_message text NULL,
  response_metadata jsonb NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_deliveries IS
  'Delivery attempt records for notification outbox entries. Milestone 6.12.';

-- Constraints
ALTER TABLE public.notification_deliveries
  ADD CONSTRAINT nd_status_check CHECK (
    status IN ('processing', 'sent', 'failed')
  ),
  ADD CONSTRAINT nd_attempt_number_positive CHECK (
    attempt_number >= 1
  ),
  ADD CONSTRAINT nd_error_code_max CHECK (
    error_code IS NULL OR char_length(error_code) <= 100
  ),
  ADD CONSTRAINT nd_error_message_max CHECK (
    error_message IS NULL OR char_length(error_message) <= 2000
  ),
  ADD CONSTRAINT nd_provider_max CHECK (
    char_length(provider) BETWEEN 1 AND 50
  );

-- Indexes
CREATE INDEX idx_nd_tenant ON public.notification_deliveries (tenant_id);
CREATE INDEX idx_nd_outbox ON public.notification_deliveries (outbox_id);
CREATE INDEX idx_nd_tenant_status_created ON public.notification_deliveries (tenant_id, status, created_at);
CREATE INDEX idx_nd_provider_message ON public.notification_deliveries (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- RLS
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nd_select_owner_admin"
  ON public.notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = notification_deliveries.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- No direct client insert/update/delete — managed via RPCs

-- ============================================================
-- PART E: Outbox Tenant Validation Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_notification_outbox_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify appointment belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = NEW.appointment_id AND a.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Appointment does not belong to this tenant';
  END IF;

  -- Verify template type matches event type
  IF NEW.template_type <> NEW.event_type THEN
    RAISE EXCEPTION 'Template type must match event type';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_notification_outbox_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, appointment_id, event_type, template_type
  ON public.notification_outbox
  FOR EACH ROW EXECUTE FUNCTION public.verify_notification_outbox_tenant();

-- ============================================================
-- PART F: Enqueue Appointment Notification RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_appointment_notification(
  p_tenant_id uuid,
  p_appointment_id uuid,
  p_event_type text,
  p_recipient_email text,
  p_payload jsonb,
  p_idempotency_key text,
  p_rendered_subject text DEFAULT NULL,
  p_rendered_html text DEFAULT NULL,
  p_rendered_text text DEFAULT NULL,
  p_sender_name text DEFAULT NULL,
  p_reply_to_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- Verify appointment belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id AND a.tenant_id = p_tenant_id
  ) THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'appointment_not_found');
  END IF;

  -- Validate event type
  IF p_event_type NOT IN ('appointment_created', 'appointment_rescheduled', 'appointment_cancelled') THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'invalid_event_type');
  END IF;

  -- Check for existing idempotency key
  SELECT id INTO v_existing_id
  FROM public.notification_outbox
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate', 'outbox_id', v_existing_id);
  END IF;

  -- Insert new outbox entry
  INSERT INTO public.notification_outbox (
    tenant_id, appointment_id, event_type, channel, recipient_email,
    template_type, payload, idempotency_key, status, next_attempt_at,
    rendered_subject, rendered_html, rendered_text, sender_name, reply_to_email
  ) VALUES (
    p_tenant_id, p_appointment_id, p_event_type, 'email', p_recipient_email,
    p_event_type, p_payload, p_idempotency_key, 'pending', now(),
    p_rendered_subject, p_rendered_html, p_rendered_text, p_sender_name, p_reply_to_email
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('status', 'created', 'outbox_id', v_new_id);
END;
$$;

COMMENT ON FUNCTION public.enqueue_appointment_notification IS
  'Idempotently enqueues an appointment notification into the outbox. SECURITY DEFINER.';

-- ============================================================
-- PART G: Claim Notification Outbox Batch RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_notification_outbox_batch(
  p_worker_id text,
  p_batch_size integer DEFAULT 10
)
RETURNS SETOF public.notification_outbox
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enforce maximum batch size
  IF p_batch_size > 50 THEN
    p_batch_size := 50;
  END IF;

  -- Recover stale locks (processing for > 10 minutes)
  UPDATE public.notification_outbox
  SET
    status = 'pending',
    locked_at = NULL,
    locked_by = NULL
  WHERE status = 'processing'
    AND locked_at < now() - interval '10 minutes';

  -- Claim pending/retryable rows
  RETURN QUERY
  UPDATE public.notification_outbox
  SET
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = attempt_count + 1
  WHERE id IN (
    SELECT id FROM public.notification_outbox
    WHERE status = 'pending'
      AND next_attempt_at <= now()
    ORDER BY next_attempt_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_size
  )
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.claim_notification_outbox_batch IS
  'Claims a batch of pending outbox entries for processing. Uses SKIP LOCKED for concurrency safety.';

-- ============================================================
-- PART H: Mark Notification Sent RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_notification_sent(
  p_outbox_id uuid,
  p_worker_id text,
  p_provider text,
  p_provider_message_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_attempt integer;
BEGIN
  -- Verify lock ownership
  SELECT tenant_id, attempt_count INTO v_tenant_id, v_attempt
  FROM public.notification_outbox
  WHERE id = p_outbox_id AND locked_by = p_worker_id AND status = 'processing';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Outbox entry not found or not owned by this worker';
  END IF;

  -- Update outbox to sent
  UPDATE public.notification_outbox
  SET
    status = 'sent',
    processed_at = now(),
    locked_at = NULL,
    locked_by = NULL,
    last_error_code = NULL,
    last_error_message = NULL
  WHERE id = p_outbox_id;

  -- Record successful delivery
  INSERT INTO public.notification_deliveries (
    tenant_id, outbox_id, provider, provider_message_id,
    attempt_number, status, completed_at
  ) VALUES (
    v_tenant_id, p_outbox_id, p_provider, p_provider_message_id,
    v_attempt, 'sent', now()
  );
END;
$$;

COMMENT ON FUNCTION public.mark_notification_sent IS
  'Marks an outbox entry as sent and records the successful delivery attempt.';

-- ============================================================
-- PART I: Mark Notification Failed RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_notification_failed(
  p_outbox_id uuid,
  p_worker_id text,
  p_provider text,
  p_error_code text,
  p_error_message text,
  p_retryable boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_attempt integer;
  v_max_attempts integer := 5;
  v_next_delay interval;
  v_new_status text;
BEGIN
  -- Verify lock ownership
  SELECT tenant_id, attempt_count INTO v_tenant_id, v_attempt
  FROM public.notification_outbox
  WHERE id = p_outbox_id AND locked_by = p_worker_id AND status = 'processing';

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Outbox entry not found or not owned by this worker';
  END IF;

  -- Determine next status based on retry logic
  IF NOT p_retryable OR v_attempt >= v_max_attempts THEN
    v_new_status := 'failed';
    v_next_delay := NULL;
  ELSE
    v_new_status := 'pending';
    -- Exponential backoff with jitter: 1m, 5m, 30m, 2h
    CASE v_attempt
      WHEN 1 THEN v_next_delay := interval '1 minute' + (random() * interval '10 seconds');
      WHEN 2 THEN v_next_delay := interval '5 minutes' + (random() * interval '30 seconds');
      WHEN 3 THEN v_next_delay := interval '30 minutes' + (random() * interval '60 seconds');
      WHEN 4 THEN v_next_delay := interval '2 hours' + (random() * interval '120 seconds');
      ELSE v_next_delay := interval '2 hours';
    END CASE;
  END IF;

  -- Update outbox
  UPDATE public.notification_outbox
  SET
    status = v_new_status,
    locked_at = NULL,
    locked_by = NULL,
    last_error_code = p_error_code,
    last_error_message = p_error_message,
    next_attempt_at = CASE
      WHEN v_next_delay IS NOT NULL THEN now() + v_next_delay
      ELSE next_attempt_at
    END,
    processed_at = CASE
      WHEN v_new_status = 'failed' THEN now()
      ELSE NULL
    END
  WHERE id = p_outbox_id;

  -- Record failed delivery attempt
  INSERT INTO public.notification_deliveries (
    tenant_id, outbox_id, provider, attempt_number,
    status, error_code, error_message, completed_at
  ) VALUES (
    v_tenant_id, p_outbox_id, p_provider, v_attempt,
    'failed', p_error_code, p_error_message, now()
  );
END;
$$;

COMMENT ON FUNCTION public.mark_notification_failed IS
  'Records a failed delivery attempt. Retries with backoff if retryable and under max attempts.';

-- ============================================================
-- PART J: Retry Failed Notification RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.retry_failed_notification(
  p_outbox_id uuid,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Verify row belongs to tenant and is in failed status
  SELECT status INTO v_current_status
  FROM public.notification_outbox
  WHERE id = p_outbox_id AND tenant_id = p_tenant_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'not_found');
  END IF;

  IF v_current_status <> 'failed' THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'not_failed');
  END IF;

  -- Reset to pending for retry
  UPDATE public.notification_outbox
  SET
    status = 'pending',
    next_attempt_at = now(),
    locked_at = NULL,
    locked_by = NULL,
    last_error_code = NULL,
    last_error_message = NULL
  WHERE id = p_outbox_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object('status', 'retried', 'outbox_id', p_outbox_id);
END;
$$;

COMMENT ON FUNCTION public.retry_failed_notification IS
  'Resets a failed notification to pending for manual retry. Admin action only.';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
