-- Milestone 11.4 — Appointment Payment Requirements, Deadlines & Booking Integration
-- ====================================================================================

-- ─── Tenant Appointment Payment Settings ─────────────────────────────────────

CREATE TABLE public.tenant_appointment_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

  online_payments_enabled BOOLEAN NOT NULL DEFAULT false,
  default_payment_requirement TEXT NOT NULL DEFAULT 'none',
  payment_deadline_minutes INTEGER NOT NULL DEFAULT 15,
  allow_pay_later BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_appointment_payment_settings IS
  'Per-tenant appointment payment policy. Defaults: payments disabled, no requirement. Milestone 11.4.';

ALTER TABLE public.tenant_appointment_payment_settings
  ADD CONSTRAINT taps_requirement_check CHECK (
    default_payment_requirement IN ('none', 'full')
  ),
  ADD CONSTRAINT taps_deadline_bounds CHECK (
    payment_deadline_minutes BETWEEN 5 AND 60
  );

CREATE TRIGGER trg_taps_updated_at
  BEFORE UPDATE ON public.tenant_appointment_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.tenant_appointment_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taps_select_member"
  ON public.tenant_appointment_payment_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_appointment_payment_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Service Payment Rules ───────────────────────────────────────────────────

CREATE TABLE public.service_payment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,

  payment_requirement TEXT NULL,
  payment_deadline_minutes INTEGER NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, service_id)
);

COMMENT ON TABLE public.service_payment_rules IS
  'Per-service payment requirement overrides. NULL = inherit from tenant. Milestone 11.4.';

ALTER TABLE public.service_payment_rules
  ADD CONSTRAINT spr_requirement_check CHECK (
    payment_requirement IS NULL OR payment_requirement IN ('none', 'full')
  ),
  ADD CONSTRAINT spr_deadline_bounds CHECK (
    payment_deadline_minutes IS NULL OR payment_deadline_minutes BETWEEN 5 AND 60
  );

-- Tenant consistency trigger
CREATE TRIGGER trg_spr_tenant_consistency
  BEFORE INSERT OR UPDATE ON public.service_payment_rules
  FOR EACH ROW EXECUTE FUNCTION public.verify_service_tenant_consistency();

CREATE TRIGGER trg_spr_updated_at
  BEFORE UPDATE ON public.service_payment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.service_payment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spr_select_member"
  ON public.service_payment_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = service_payment_rules.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Appointment Payments Deadline Columns ───────────────────────────────────

ALTER TABLE public.appointment_payments
  ADD COLUMN payment_due_at TIMESTAMPTZ NULL,
  ADD COLUMN expired_at TIMESTAMPTZ NULL,
  ADD COLUMN requires_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN review_reason TEXT NULL;

-- Index for expiry processor
CREATE INDEX idx_ap_expiry_candidates
  ON public.appointment_payments (payment_due_at, status)
  WHERE payment_requirement = 'full'
    AND payment_due_at IS NOT NULL
    AND status IN ('unpaid', 'pending');

-- ─── Claim Expired Appointment Payments RPC ──────────────────────────────────

CREATE OR REPLACE FUNCTION claim_expired_appointment_payments(
  p_batch_size INTEGER DEFAULT 50,
  p_worker_id TEXT DEFAULT 'expiry_worker'
)
RETURNS TABLE(
  appointment_payment_id UUID,
  appointment_id UUID,
  tenant_id UUID,
  payment_intent_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.id AS appointment_payment_id,
    ap.appointment_id,
    ap.tenant_id,
    ap.latest_payment_intent_id AS payment_intent_id
  FROM appointment_payments ap
  INNER JOIN appointments a ON a.id = ap.appointment_id
  WHERE ap.payment_requirement = 'full'
    AND ap.payment_due_at IS NOT NULL
    AND ap.payment_due_at <= NOW()
    AND ap.status IN ('unpaid', 'pending')
    AND ap.expired_at IS NULL
    AND a.status NOT IN ('cancelled', 'completed', 'no_show')
  ORDER BY ap.payment_due_at ASC
  LIMIT LEAST(p_batch_size, 50)
  FOR UPDATE OF ap SKIP LOCKED;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_expired_appointment_payments TO authenticated;

-- ─── Cancel Expired Appointment Payment RPC ──────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_expired_appointment_payment(
  p_appointment_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_appointment RECORD;
BEGIN
  -- Lock payment
  SELECT * INTO v_payment
  FROM appointment_payments
  WHERE id = p_appointment_payment_id
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Re-check: if paid since claim, do NOT cancel
  IF v_payment.status = 'paid' OR v_payment.amount_paid >= v_payment.amount_total THEN
    RETURN jsonb_build_object('status', 'already_paid');
  END IF;

  -- Re-check: already expired
  IF v_payment.expired_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_expired');
  END IF;

  -- Lock appointment
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = v_payment.appointment_id
  FOR UPDATE;

  IF v_appointment IS NULL THEN
    RETURN jsonb_build_object('status', 'appointment_not_found');
  END IF;

  -- If appointment already terminal, just mark payment expired
  IF v_appointment.status IN ('cancelled', 'completed', 'no_show') THEN
    UPDATE appointment_payments
    SET expired_at = NOW(), status = 'cancelled'
    WHERE id = p_appointment_payment_id;
    RETURN jsonb_build_object('status', 'appointment_already_terminal');
  END IF;

  -- Mark payment expired
  UPDATE appointment_payments
  SET expired_at = NOW(), status = 'cancelled'
  WHERE id = p_appointment_payment_id;

  -- Cancel any open/creating payment intents
  UPDATE payment_intents
  SET status = 'cancelled'
  WHERE appointment_payment_id = p_appointment_payment_id
    AND status IN ('creating', 'open', 'processing');

  -- Cancel the appointment
  UPDATE appointments
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = 'Payment deadline expired'
  WHERE id = v_payment.appointment_id;

  RETURN jsonb_build_object(
    'status', 'cancelled',
    'appointment_id', v_payment.appointment_id::TEXT,
    'tenant_id', v_payment.tenant_id::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_expired_appointment_payment TO authenticated;

-- ─── Handle Late Payment (order.paid after expiry) ───────────────────────────

CREATE OR REPLACE FUNCTION handle_late_appointment_payment(
  p_payment_intent_id UUID,
  p_provider_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent RECORD;
  v_payment RECORD;
BEGIN
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE id = p_payment_intent_id
  FOR UPDATE;

  IF v_intent IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  SELECT * INTO v_payment
  FROM appointment_payments
  WHERE id = v_intent.appointment_payment_id
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('status', 'payment_not_found');
  END IF;

  -- Mark intent as succeeded (payment was received)
  UPDATE payment_intents
  SET status = 'succeeded',
      completed_at = NOW(),
      provider_order_id = COALESCE(p_provider_order_id, provider_order_id)
  WHERE id = p_payment_intent_id;

  -- Mark payment with review flag (don't reactivate appointment)
  UPDATE appointment_payments
  SET amount_paid = v_intent.amount,
      requires_review = true,
      review_reason = 'Payment received after appointment was released due to deadline expiry'
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'status', 'late_payment_flagged',
    'appointment_id', v_payment.appointment_id::TEXT,
    'tenant_id', v_payment.tenant_id::TEXT
  );
END;
$$;

GRANT EXECUTE ON FUNCTION handle_late_appointment_payment TO authenticated;
