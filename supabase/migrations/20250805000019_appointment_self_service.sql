-- Migration: Secure Customer Appointment Self-Service (Milestone 6.14)
-- Introduces tokenized public appointment management with revocation, expiry,
-- customer action audit logging, and idempotent customer mutation requests.

-- ============================================================
-- PART A: Appointment Access Tokens
-- ============================================================

CREATE TABLE public.appointment_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  purpose text NOT NULL DEFAULT 'manage_appointment',
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NULL,
  use_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz NULL,
  revocation_reason text NULL,
  token_ciphertext text NOT NULL,
  token_iv text NOT NULL,
  token_auth_tag text NOT NULL,
  encryption_key_version smallint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appt_access_token_hash_format CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT appt_access_token_prefix_format CHECK (token_prefix ~ '^[A-Za-z0-9_-]{6,20}$'),
  CONSTRAINT appt_access_token_purpose_check CHECK (purpose = 'manage_appointment'),
  CONSTRAINT appt_access_token_expiry_after_create CHECK (expires_at > created_at),
  CONSTRAINT appt_access_token_use_count_non_negative CHECK (use_count >= 0),
  CONSTRAINT appt_access_token_revoked_requires_timestamp CHECK (
    revocation_reason IS NULL OR revoked_at IS NOT NULL
  ),
  CONSTRAINT appt_access_token_revocation_reason_max CHECK (
    revocation_reason IS NULL OR char_length(revocation_reason) <= 500
  ),
  CONSTRAINT appt_access_token_ciphertext_non_empty CHECK (
    char_length(token_ciphertext) > 0
    AND char_length(token_iv) > 0
    AND char_length(token_auth_tag) > 0
  )
);

ALTER TABLE public.appointment_access_tokens
  ADD CONSTRAINT appt_access_token_hash_unique UNIQUE (token_hash);

-- One active token per appointment and purpose.
CREATE UNIQUE INDEX uq_appt_access_token_active_per_appointment_purpose
  ON public.appointment_access_tokens (appointment_id, purpose)
  WHERE revoked_at IS NULL;

CREATE INDEX idx_appt_access_tokens_appointment
  ON public.appointment_access_tokens (appointment_id, created_at DESC);

CREATE INDEX idx_appt_access_tokens_tenant
  ON public.appointment_access_tokens (tenant_id, created_at DESC);

CREATE TRIGGER trg_appointment_access_tokens_updated_at
  BEFORE UPDATE ON public.appointment_access_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.verify_appointment_access_token_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.purpose <> 'manage_appointment' THEN
    RAISE EXCEPTION 'Unsupported appointment token purpose';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = NEW.appointment_id
      AND a.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Appointment does not belong to tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_appointment_access_token_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, appointment_id, purpose
  ON public.appointment_access_tokens
  FOR EACH ROW EXECUTE FUNCTION public.verify_appointment_access_token_tenant();

-- ============================================================
-- PART B: Customer Action History
-- ============================================================

CREATE TABLE public.appointment_customer_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  access_token_id uuid NULL REFERENCES public.appointment_access_tokens(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  status text NOT NULL,
  previous_starts_at timestamptz NULL,
  new_starts_at timestamptz NULL,
  previous_resource_id uuid NULL REFERENCES public.resources(id) ON DELETE SET NULL,
  new_resource_id uuid NULL REFERENCES public.resources(id) ON DELETE SET NULL,
  reason text NULL,
  failure_code text NULL,
  ip_hash text NULL,
  user_agent_summary text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appt_customer_actions_action_type_check CHECK (
    action_type IN (
      'viewed',
      'cancellation_requested',
      'cancelled',
      'reschedule_started',
      'rescheduled',
      'failed'
    )
  ),
  CONSTRAINT appt_customer_actions_status_check CHECK (
    status IN ('success', 'failed')
  ),
  CONSTRAINT appt_customer_actions_reason_max CHECK (
    reason IS NULL OR char_length(reason) <= 500
  ),
  CONSTRAINT appt_customer_actions_failure_code_max CHECK (
    failure_code IS NULL OR char_length(failure_code) <= 120
  ),
  CONSTRAINT appt_customer_actions_ip_hash_format CHECK (
    ip_hash IS NULL OR ip_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT appt_customer_actions_ua_summary_max CHECK (
    user_agent_summary IS NULL OR char_length(user_agent_summary) <= 200
  )
);

CREATE INDEX idx_appt_customer_actions_appointment
  ON public.appointment_customer_actions (appointment_id, created_at DESC);

CREATE INDEX idx_appt_customer_actions_tenant
  ON public.appointment_customer_actions (tenant_id, created_at DESC);

CREATE INDEX idx_appt_customer_actions_token
  ON public.appointment_customer_actions (access_token_id, created_at DESC)
  WHERE access_token_id IS NOT NULL;

CREATE INDEX idx_appt_customer_actions_ip_hash
  ON public.appointment_customer_actions (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

-- ============================================================
-- PART C: Idempotency Request Tracking
-- ============================================================

CREATE TABLE public.appointment_customer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  access_token_id uuid NOT NULL REFERENCES public.appointment_access_tokens(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL,
  result_snapshot jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT appt_customer_requests_type_check CHECK (
    request_type IN ('cancel', 'reschedule')
  ),
  CONSTRAINT appt_customer_requests_hash_format CHECK (
    request_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT appt_customer_requests_status_check CHECK (
    status IN ('in_progress', 'succeeded', 'failed')
  )
);

CREATE UNIQUE INDEX uq_appt_customer_requests_idempotency
  ON public.appointment_customer_requests (access_token_id, request_type, idempotency_key);

CREATE INDEX idx_appt_customer_requests_appointment
  ON public.appointment_customer_requests (appointment_id, created_at DESC);

CREATE INDEX idx_appt_customer_requests_tenant
  ON public.appointment_customer_requests (tenant_id, created_at DESC);

-- ============================================================
-- PART D: Row-Level Security
-- ============================================================

ALTER TABLE public.appointment_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_customer_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_customer_requests ENABLE ROW LEVEL SECURITY;

-- No direct client table access. Token creation, lookup, revocation,
-- usage tracking, action logging, and idempotency persistence are
-- performed only via trusted server-side services and RPCs.
REVOKE ALL ON TABLE public.appointment_access_tokens FROM anon;
REVOKE ALL ON TABLE public.appointment_access_tokens FROM authenticated;

REVOKE ALL ON TABLE public.appointment_customer_actions FROM anon;
REVOKE ALL ON TABLE public.appointment_customer_actions FROM authenticated;

REVOKE ALL ON TABLE public.appointment_customer_requests FROM anon;
REVOKE ALL ON TABLE public.appointment_customer_requests FROM authenticated;

-- ============================================================
-- PART E: RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.rotate_appointment_access_token(
  p_tenant_id uuid,
  p_appointment_id uuid,
  p_token_hash text,
  p_token_prefix text,
  p_expires_at timestamptz,
  p_token_ciphertext text,
  p_token_iv text,
  p_token_auth_tag text,
  p_encryption_key_version smallint,
  p_revocation_reason text DEFAULT 'rotated'
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  appointment_id uuid,
  token_prefix text,
  purpose text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT tm.role INTO v_role
  FROM public.tenant_members tm
  WHERE tm.tenant_id = p_tenant_id
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  LIMIT 1;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id
      AND a.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Appointment not found for tenant';
  END IF;

  UPDATE public.appointment_access_tokens
  SET
    revoked_at = now(),
    revocation_reason = left(COALESCE(p_revocation_reason, 'rotated'), 500),
    updated_at = now()
  WHERE appointment_id = p_appointment_id
    AND tenant_id = p_tenant_id
    AND purpose = 'manage_appointment'
    AND revoked_at IS NULL;

  RETURN QUERY
  INSERT INTO public.appointment_access_tokens (
    tenant_id,
    appointment_id,
    token_hash,
    token_prefix,
    purpose,
    expires_at,
    token_ciphertext,
    token_iv,
    token_auth_tag,
    encryption_key_version
  )
  VALUES (
    p_tenant_id,
    p_appointment_id,
    p_token_hash,
    p_token_prefix,
    'manage_appointment',
    p_expires_at,
    p_token_ciphertext,
    p_token_iv,
    p_token_auth_tag,
    p_encryption_key_version
  )
  RETURNING
    appointment_access_tokens.id,
    appointment_access_tokens.tenant_id,
    appointment_access_tokens.appointment_id,
    appointment_access_tokens.token_prefix,
    appointment_access_tokens.purpose,
    appointment_access_tokens.expires_at,
    appointment_access_tokens.revoked_at,
    appointment_access_tokens.created_at,
    appointment_access_tokens.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_appointment_access_token(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  smallint,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.rotate_appointment_access_token(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  smallint,
  text
) FROM anon;

GRANT EXECUTE ON FUNCTION public.rotate_appointment_access_token(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  smallint,
  text
) TO authenticated;

COMMENT ON FUNCTION public.rotate_appointment_access_token(
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  smallint,
  text
) IS 'Revokes existing active management token(s) for an appointment and inserts a replacement token row using pre-hashed and encrypted token inputs.';
