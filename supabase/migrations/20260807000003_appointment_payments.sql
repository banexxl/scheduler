-- Milestone 11.1 — Appointment Payment Model & Payment Intent Foundation
-- ========================================================================

-- ─── Appointment Payments ────────────────────────────────────────────────────

CREATE TABLE public.appointment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'not_required',
  payment_requirement TEXT NOT NULL DEFAULT 'none',
  provider TEXT NULL,

  currency TEXT NOT NULL,
  amount_total BIGINT NOT NULL,
  amount_paid BIGINT NOT NULL DEFAULT 0,
  amount_refunded BIGINT NOT NULL DEFAULT 0,

  latest_payment_intent_id UUID NULL,

  paid_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.appointment_payments IS
  'Per-appointment payment summary. One row per appointment. Provider-neutral. Milestone 11.1.';

-- Constraints
ALTER TABLE public.appointment_payments
  ADD CONSTRAINT ap_unique_tenant_appointment UNIQUE (tenant_id, appointment_id),
  ADD CONSTRAINT ap_status_check CHECK (
    status IN ('not_required', 'unpaid', 'pending', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'failed', 'cancelled')
  ),
  ADD CONSTRAINT ap_payment_requirement_check CHECK (
    payment_requirement IN ('none', 'full', 'deposit')
  ),
  ADD CONSTRAINT ap_provider_check CHECK (
    provider IS NULL OR provider IN ('polar', 'manual', 'external')
  ),
  ADD CONSTRAINT ap_currency_format CHECK (
    currency ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT ap_amount_total_non_negative CHECK (amount_total >= 0),
  ADD CONSTRAINT ap_amount_paid_non_negative CHECK (amount_paid >= 0),
  ADD CONSTRAINT ap_amount_refunded_non_negative CHECK (amount_refunded >= 0),
  ADD CONSTRAINT ap_refunded_lte_paid CHECK (amount_refunded <= amount_paid),
  ADD CONSTRAINT ap_paid_requires_paid_at CHECK (
    status != 'paid' OR paid_at IS NOT NULL
  );

-- Indexes
CREATE INDEX idx_ap_tenant_appointment ON public.appointment_payments (tenant_id, appointment_id);
CREATE INDEX idx_ap_tenant_status ON public.appointment_payments (tenant_id, status);

-- Updated-at trigger
CREATE TRIGGER trg_appointment_payments_updated_at
  BEFORE UPDATE ON public.appointment_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Payment Intents ─────────────────────────────────────────────────────────

CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  appointment_payment_id UUID NOT NULL REFERENCES public.appointment_payments(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating',

  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,

  request_key TEXT NOT NULL,

  provider_checkout_id TEXT NULL,
  provider_order_id TEXT NULL,
  provider_payment_id TEXT NULL,

  checkout_url TEXT NULL,

  failure_code TEXT NULL,
  failure_message TEXT NULL,

  expires_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_intents IS
  'Individual payment attempt/intent. Provider-neutral. Milestone 11.1.';

-- Constraints
ALTER TABLE public.payment_intents
  ADD CONSTRAINT pi_unique_tenant_request_key UNIQUE (tenant_id, request_key),
  ADD CONSTRAINT pi_status_check CHECK (
    status IN ('creating', 'open', 'processing', 'succeeded', 'failed', 'expired', 'cancelled')
  ),
  ADD CONSTRAINT pi_provider_check CHECK (
    provider IN ('polar', 'manual', 'external')
  ),
  ADD CONSTRAINT pi_currency_format CHECK (
    currency ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT pi_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT pi_succeeded_requires_completed CHECK (
    status != 'succeeded' OR completed_at IS NOT NULL
  ),
  ADD CONSTRAINT pi_metadata_is_object CHECK (
    jsonb_typeof(metadata) = 'object'
  );

-- Indexes
CREATE INDEX idx_pi_tenant_appointment ON public.payment_intents (tenant_id, appointment_id, created_at DESC);
CREATE INDEX idx_pi_payment_id ON public.payment_intents (appointment_payment_id, created_at DESC);
CREATE INDEX idx_pi_tenant_status ON public.payment_intents (tenant_id, status, created_at);

-- Partial unique indexes for provider IDs (non-null only)
CREATE UNIQUE INDEX idx_pi_provider_checkout_id
  ON public.payment_intents (provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX idx_pi_provider_order_id
  ON public.payment_intents (provider_order_id)
  WHERE provider_order_id IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER trg_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Relationship Verification Trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_appointment_payment_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- For appointment_payments: verify appointment belongs to same tenant
  IF TG_TABLE_NAME = 'appointment_payments' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.appointments
      WHERE id = NEW.appointment_id AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Appointment does not belong to this tenant';
    END IF;
  END IF;

  -- For payment_intents: verify appointment_payment belongs to same tenant+appointment
  IF TG_TABLE_NAME = 'payment_intents' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.appointment_payments
      WHERE id = NEW.appointment_payment_id
        AND tenant_id = NEW.tenant_id
        AND appointment_id = NEW.appointment_id
    ) THEN
      RAISE EXCEPTION 'Payment intent relationship mismatch: tenant/appointment/payment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_appointment_payment_tenant
  BEFORE INSERT OR UPDATE ON public.appointment_payments
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_payment_relationships();

CREATE TRIGGER trg_verify_payment_intent_relationships
  BEFORE INSERT OR UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_payment_relationships();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Appointment payments: tenant members can read
CREATE POLICY "ap_select_member"
  ON public.appointment_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = appointment_payments.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Payment intents: tenant members can read
CREATE POLICY "pi_select_member"
  ON public.payment_intents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = payment_intents.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct client INSERT/UPDATE/DELETE — mutations via trusted server actions only
