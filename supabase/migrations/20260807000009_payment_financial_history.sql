-- Milestone 11.8 — Payment Financial History & Aggregation
-- =========================================================

-- ─── Provider Financial Snapshot on Appointment Payments ─────────────────────

ALTER TABLE public.appointment_payments
  ADD COLUMN IF NOT EXISTS provider_subtotal_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS provider_discount_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS provider_tax_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS provider_total_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS discount_code_snapshot TEXT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_snapshot BIGINT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS receipt_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_available BOOLEAN NOT NULL DEFAULT false;

-- ─── Provider Financial Snapshot on Package Purchases ────────────────────────

ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS provider_subtotal_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS provider_discount_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS provider_tax_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS provider_total_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS discount_code_snapshot TEXT NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_snapshot BIGINT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS receipt_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_available BOOLEAN NOT NULL DEFAULT false;

-- ─── Indexes for Financial History ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ap_tenant_paid_at
  ON public.appointment_payments (tenant_id, paid_at DESC)
  WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pp_tenant_paid_at
  ON public.package_purchases (tenant_id, paid_at DESC)
  WHERE paid_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_apr_tenant_completed
  ON public.appointment_payment_refunds (tenant_id, completed_at DESC)
  WHERE status = 'succeeded';

-- ─── Tenant Payment Summary RPC ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tenant_payment_summary(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_appt JSONB;
  v_pkg JSONB;
  v_refunds JSONB;
BEGIN
  SELECT jsonb_build_object(
    'count', COUNT(*)::INT,
    'currencies', COALESCE(jsonb_object_agg(sub.currency, sub.totals), '{}'::JSONB)
  ) INTO v_appt
  FROM (
    SELECT currency,
      jsonb_build_object(
        'paid_amount', COALESCE(SUM(amount_paid), 0)::BIGINT,
        'discount_amount', COALESCE(SUM(discount_amount_snapshot), 0)::BIGINT
      ) AS totals
    FROM appointment_payments
    WHERE tenant_id = p_tenant_id
      AND paid_at >= p_from AND paid_at < p_to
      AND status IN ('paid', 'partially_refunded', 'refunded')
    GROUP BY currency
  ) sub;

  SELECT jsonb_build_object(
    'count', COUNT(*)::INT,
    'currencies', COALESCE(jsonb_object_agg(sub.currency, sub.totals), '{}'::JSONB)
  ) INTO v_pkg
  FROM (
    SELECT currency,
      jsonb_build_object(
        'paid_amount', COALESCE(SUM(amount_total), 0)::BIGINT,
        'discount_amount', COALESCE(SUM(discount_amount_snapshot), 0)::BIGINT
      ) AS totals
    FROM package_purchases
    WHERE tenant_id = p_tenant_id
      AND paid_at >= p_from AND paid_at < p_to
      AND status IN ('paid', 'fulfilled')
    GROUP BY currency
  ) sub;

  SELECT jsonb_build_object(
    'count', COUNT(*)::INT,
    'currencies', COALESCE(jsonb_object_agg(sub.currency, sub.totals), '{}'::JSONB)
  ) INTO v_refunds
  FROM (
    SELECT currency,
      jsonb_build_object(
        'refunded_amount', COALESCE(SUM(amount), 0)::BIGINT
      ) AS totals
    FROM appointment_payment_refunds
    WHERE tenant_id = p_tenant_id
      AND completed_at >= p_from AND completed_at < p_to
      AND status = 'succeeded'
    GROUP BY currency
  ) sub;

  v_result := jsonb_build_object(
    'appointment_payments', COALESCE(v_appt, '{"count":0,"currencies":{}}'::JSONB),
    'package_purchases', COALESCE(v_pkg, '{"count":0,"currencies":{}}'::JSONB),
    'refunds', COALESCE(v_refunds, '{"count":0,"currencies":{}}'::JSONB)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_payment_summary TO authenticated;
