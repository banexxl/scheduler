-- Milestone 11.3 — Appointment Payment Webhook Confirmation
-- ============================================================

-- ─── Apply Order Paid RPC (transactional, idempotent) ────────────────────────

CREATE OR REPLACE FUNCTION apply_appointment_payment_order_paid(
  p_payment_intent_id UUID,
  p_provider_order_id TEXT,
  p_provider_payment_id TEXT DEFAULT NULL,
  p_provider_event_id TEXT DEFAULT NULL,
  p_paid_amount BIGINT DEFAULT NULL,
  p_paid_currency TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent RECORD;
  v_payment RECORD;
  v_result JSONB;
BEGIN
  -- Lock and load intent
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE id = p_payment_intent_id
  FOR UPDATE;

  IF v_intent IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found', 'reason', 'Payment intent not found');
  END IF;

  -- Already succeeded — idempotent success
  IF v_intent.status = 'succeeded' THEN
    RETURN jsonb_build_object('status', 'already_applied', 'payment_intent_id', v_intent.id::TEXT);
  END IF;

  -- Verify amount if provided
  IF p_paid_amount IS NOT NULL AND p_paid_amount != v_intent.amount THEN
    RETURN jsonb_build_object(
      'status', 'amount_mismatch',
      'expected', v_intent.amount,
      'received', p_paid_amount
    );
  END IF;

  -- Verify currency if provided
  IF p_paid_currency IS NOT NULL AND upper(p_paid_currency) != v_intent.currency THEN
    RETURN jsonb_build_object(
      'status', 'currency_mismatch',
      'expected', v_intent.currency,
      'received', p_paid_currency
    );
  END IF;

  -- Lock and load appointment payment
  SELECT * INTO v_payment
  FROM appointment_payments
  WHERE id = v_intent.appointment_payment_id
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RETURN jsonb_build_object('status', 'payment_not_found');
  END IF;

  -- Verify tenant consistency
  IF v_payment.tenant_id != v_intent.tenant_id THEN
    RETURN jsonb_build_object('status', 'tenant_mismatch');
  END IF;

  -- Mark intent succeeded
  UPDATE payment_intents
  SET status = 'succeeded',
      completed_at = NOW(),
      provider_order_id = COALESCE(p_provider_order_id, provider_order_id),
      provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id)
  WHERE id = p_payment_intent_id;

  -- Update appointment payment amounts (idempotent: set to intent amount, don't add)
  -- Only update if not already at or above this amount
  IF v_payment.amount_paid < v_intent.amount THEN
    UPDATE appointment_payments
    SET amount_paid = v_intent.amount,
        status = CASE
          WHEN v_intent.amount >= v_payment.amount_total THEN 'paid'
          WHEN v_intent.amount > 0 THEN 'partially_paid'
          ELSE status
        END,
        paid_at = CASE
          WHEN v_intent.amount >= v_payment.amount_total AND paid_at IS NULL THEN NOW()
          ELSE paid_at
        END,
        latest_payment_intent_id = p_payment_intent_id,
        provider = 'polar'
    WHERE id = v_payment.id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'applied',
    'payment_intent_id', v_intent.id::TEXT,
    'appointment_payment_id', v_payment.id::TEXT,
    'amount_paid', v_intent.amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_appointment_payment_order_paid TO authenticated;

-- ─── Expire Payment Intent RPC ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_appointment_payment_intent(
  p_payment_intent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent RECORD;
  v_payment RECORD;
  v_has_other_active BOOLEAN;
BEGIN
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE id = p_payment_intent_id
  FOR UPDATE;

  IF v_intent IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Don't expire if already terminal
  IF v_intent.status IN ('succeeded', 'failed', 'expired', 'cancelled') THEN
    RETURN jsonb_build_object('status', 'already_terminal', 'current_status', v_intent.status);
  END IF;

  -- Mark expired
  UPDATE payment_intents
  SET status = 'expired'
  WHERE id = p_payment_intent_id;

  -- Check if other active intents exist for this payment
  SELECT EXISTS (
    SELECT 1 FROM payment_intents
    WHERE appointment_payment_id = v_intent.appointment_payment_id
      AND id != p_payment_intent_id
      AND status IN ('creating', 'open', 'processing')
  ) INTO v_has_other_active;

  -- Load payment
  SELECT * INTO v_payment
  FROM appointment_payments
  WHERE id = v_intent.appointment_payment_id
  FOR UPDATE;

  -- If no other active intent and not already paid, revert to unpaid
  IF NOT v_has_other_active AND v_payment.amount_paid = 0 AND v_payment.status = 'pending' THEN
    UPDATE appointment_payments
    SET status = 'unpaid'
    WHERE id = v_payment.id;
  END IF;

  RETURN jsonb_build_object('status', 'expired', 'payment_status',
    CASE WHEN NOT v_has_other_active AND v_payment.amount_paid = 0 THEN 'unpaid' ELSE v_payment.status END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION expire_appointment_payment_intent TO authenticated;
