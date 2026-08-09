-- Milestone 11.5 — Polar Refunds & Financial Reconciliation
-- ==========================================================

-- ─── Appointment Payment Refunds Table ───────────────────────────────────────

CREATE TABLE public.appointment_payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  appointment_payment_id UUID NOT NULL REFERENCES public.appointment_payments(id) ON DELETE CASCADE,
  payment_intent_id UUID NULL REFERENCES public.payment_intents(id) ON DELETE SET NULL,

  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating',
  origin TEXT NOT NULL DEFAULT 'platform',

  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,

  reason_code TEXT NULL,
  reason_note TEXT NULL,

  requested_by UUID NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  provider_refund_id TEXT NULL,
  provider_order_id TEXT NULL,

  failure_code TEXT NULL,
  failure_message TEXT NULL,

  completed_at TIMESTAMPTZ NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.appointment_payment_refunds IS
  'Refund records for appointment payments. Provider-neutral. Milestone 11.5.';

-- Constraints
ALTER TABLE public.appointment_payment_refunds
  ADD CONSTRAINT apr_status_check CHECK (
    status IN ('creating', 'pending', 'succeeded', 'failed', 'cancelled')
  ),
  ADD CONSTRAINT apr_origin_check CHECK (
    origin IN ('platform', 'provider')
  ),
  ADD CONSTRAINT apr_provider_check CHECK (
    provider IN ('polar', 'manual', 'external')
  ),
  ADD CONSTRAINT apr_currency_format CHECK (
    currency ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT apr_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT apr_succeeded_requires_completed CHECK (
    status != 'succeeded' OR completed_at IS NOT NULL
  ),
  ADD CONSTRAINT apr_reason_note_length CHECK (
    reason_note IS NULL OR char_length(reason_note) <= 500
  ),
  ADD CONSTRAINT apr_metadata_is_object CHECK (
    jsonb_typeof(metadata) = 'object'
  );

-- Indexes
CREATE INDEX idx_apr_tenant_payment ON public.appointment_payment_refunds (tenant_id, appointment_payment_id, created_at DESC);
CREATE INDEX idx_apr_tenant_status ON public.appointment_payment_refunds (tenant_id, status, created_at);
CREATE INDEX idx_apr_provider_order ON public.appointment_payment_refunds (provider_order_id) WHERE provider_order_id IS NOT NULL;

-- Partial unique on provider refund ID (prevents duplicate projection)
CREATE UNIQUE INDEX idx_apr_provider_refund_id
  ON public.appointment_payment_refunds (provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER trg_apr_updated_at
  BEFORE UPDATE ON public.appointment_payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Relationship verification trigger
CREATE OR REPLACE FUNCTION public.verify_refund_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_payments
    WHERE id = NEW.appointment_payment_id
      AND tenant_id = NEW.tenant_id
      AND appointment_id = NEW.appointment_id
  ) THEN
    RAISE EXCEPTION 'Refund relationship mismatch: tenant/appointment/payment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_refund_relationships
  BEFORE INSERT OR UPDATE ON public.appointment_payment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.verify_refund_relationships();

-- RLS
ALTER TABLE public.appointment_payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apr_select_member"
  ON public.appointment_payment_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_payment_refunds.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct client INSERT/UPDATE/DELETE

-- ─── Apply Refund Succeeded RPC ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION apply_appointment_refund_succeeded(
  p_refund_id UUID,
  p_provider_refund_id TEXT DEFAULT NULL,
  p_completed_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund RECORD;
  v_payment RECORD;
  v_new_refunded BIGINT;
BEGIN
  -- Lock refund
  SELECT * INTO v_refund
  FROM appointment_payment_refunds
  WHERE id = p_refund_id
  FOR UPDATE;

  IF v_refund IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Already succeeded — idempotent
  IF v_refund.status = 'succeeded' THEN
    RETURN jsonb_build_object('status', 'already_applied', 'refund_id', v_refund.id::TEXT);
  END IF;

  -- Lock payment
  SELECT * INTO v_payment
  FROM appointment_payments
  WHERE id = v_refund.appointment_payment_id
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('status', 'payment_not_found');
  END IF;

  -- Verify tenant
  IF v_payment.tenant_id != v_refund.tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  -- Calculate new refunded total
  v_new_refunded := v_payment.amount_refunded + v_refund.amount;

  -- Verify not over-refunding
  IF v_new_refunded > v_payment.amount_paid THEN
    RETURN jsonb_build_object(
      'status', 'over_refund',
      'current_refunded', v_payment.amount_refunded,
      'refund_amount', v_refund.amount,
      'amount_paid', v_payment.amount_paid
    );
  END IF;

  -- Mark refund succeeded
  UPDATE appointment_payment_refunds
  SET status = 'succeeded',
      completed_at = p_completed_at,
      provider_refund_id = COALESCE(p_provider_refund_id, provider_refund_id)
  WHERE id = p_refund_id;

  -- Update payment summary
  UPDATE appointment_payments
  SET amount_refunded = v_new_refunded,
      status = CASE
        WHEN v_new_refunded >= v_payment.amount_paid THEN 'refunded'
        WHEN v_new_refunded > 0 THEN 'partially_refunded'
        ELSE status
      END
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'status', 'applied',
    'refund_id', v_refund.id::TEXT,
    'new_amount_refunded', v_new_refunded,
    'payment_status', CASE
      WHEN v_new_refunded >= v_payment.amount_paid THEN 'refunded'
      WHEN v_new_refunded > 0 THEN 'partially_refunded'
      ELSE v_payment.status
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_appointment_refund_succeeded TO authenticated;

-- ─── Mark Refund Failed RPC ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_appointment_refund_failed(
  p_refund_id UUID,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refund RECORD;
BEGIN
  SELECT * INTO v_refund
  FROM appointment_payment_refunds
  WHERE id = p_refund_id
  FOR UPDATE;

  IF v_refund IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_refund.status = 'succeeded' THEN
    RETURN jsonb_build_object('status', 'already_succeeded');
  END IF;

  UPDATE appointment_payment_refunds
  SET status = 'failed',
      failure_code = p_failure_code,
      failure_message = LEFT(p_failure_message, 200)
  WHERE id = p_refund_id;

  RETURN jsonb_build_object('status', 'marked_failed', 'refund_id', v_refund.id::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_appointment_refund_failed TO authenticated;
