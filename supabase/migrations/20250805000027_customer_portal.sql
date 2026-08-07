-- Migration: Customer Portal (Milestone 8.6)
-- Introduces portal access tokens and sessions for email-based
-- magic-link customer portal access. Extends notification templates.

-- ============================================================
-- PART A: Customer Portal Access Tokens
-- ============================================================

CREATE TABLE public.customer_portal_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NULL,
  normalized_email text NOT NULL,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cpat_hash_format CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT cpat_prefix_format CHECK (token_prefix ~ '^[A-Za-z0-9_-]{6,20}$'),
  CONSTRAINT cpat_email_format CHECK (
    char_length(normalized_email) BETWEEN 3 AND 320
    AND normalized_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  CONSTRAINT cpat_expiry_after_create CHECK (expires_at > created_at)
);

ALTER TABLE public.customer_portal_access_tokens
  ADD CONSTRAINT cpat_hash_unique UNIQUE (token_hash);

CREATE INDEX idx_cpat_tenant ON public.customer_portal_access_tokens (tenant_id);
CREATE INDEX idx_cpat_email ON public.customer_portal_access_tokens (tenant_id, normalized_email, created_at DESC);

COMMENT ON TABLE public.customer_portal_access_tokens IS
  'Single-use magic-link tokens for customer portal access. Milestone 8.6.';

-- ============================================================
-- PART B: Customer Portal Sessions
-- ============================================================

CREATE TABLE public.customer_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NULL,
  normalized_email text NOT NULL,
  session_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cps_hash_format CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT cps_email_format CHECK (
    char_length(normalized_email) BETWEEN 3 AND 320
    AND normalized_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  CONSTRAINT cps_expiry_after_create CHECK (expires_at > created_at)
);

ALTER TABLE public.customer_portal_sessions
  ADD CONSTRAINT cps_hash_unique UNIQUE (session_hash);

CREATE INDEX idx_cps_tenant ON public.customer_portal_sessions (tenant_id);
CREATE INDEX idx_cps_email ON public.customer_portal_sessions (tenant_id, normalized_email);
CREATE INDEX idx_cps_expires ON public.customer_portal_sessions (expires_at);

COMMENT ON TABLE public.customer_portal_sessions IS
  'Longer-lived portal sessions created after magic-link consumption. 7-day TTL. Milestone 8.6.';

-- ============================================================
-- PART C: RLS — No direct public access
-- ============================================================

ALTER TABLE public.customer_portal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_portal_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_portal_access_tokens FROM anon;
REVOKE ALL ON TABLE public.customer_portal_access_tokens FROM authenticated;

REVOKE ALL ON TABLE public.customer_portal_sessions FROM anon;
REVOKE ALL ON TABLE public.customer_portal_sessions FROM authenticated;

-- Internal admin read for diagnostics
CREATE POLICY "cpat_select_owner_admin"
  ON public.customer_portal_access_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_portal_access_tokens.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "cps_select_owner_admin"
  ON public.customer_portal_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_portal_sessions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART D: Extend Notification Template Types
-- ============================================================

-- Add customer_portal_access to notification_outbox event_type
ALTER TABLE public.notification_outbox DROP CONSTRAINT no_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_event_type_check CHECK (
    event_type IN (
      'appointment_created',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'customer_portal_access'
    )
  );

-- Add to notification_outbox template_type
ALTER TABLE public.notification_outbox DROP CONSTRAINT no_template_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_template_type_check CHECK (
    template_type IN (
      'appointment_created',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'customer_portal_access'
    )
  );

-- Add to notification_templates template_type
ALTER TABLE public.notification_templates DROP CONSTRAINT nt_template_type_check;
ALTER TABLE public.notification_templates
  ADD CONSTRAINT nt_template_type_check CHECK (
    template_type IN (
      'appointment_created',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'customer_portal_access'
    )
  );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
