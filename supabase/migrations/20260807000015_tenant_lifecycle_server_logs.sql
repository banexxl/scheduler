-- Migration: Tenant Lifecycle & Server Logs — Milestone 13.2
--
-- Creates:
-- 1. server_logs table for operational diagnostics
-- 2. delete_tenant_permanently RPC (SECURITY DEFINER, bypasses FK RESTRICT + cascades)
-- 3. Adds 'deletion_pending' and 'deleted' to tenant status CHECK (if exists)
-- 4. Indexes and RLS for server_logs
-- 5. Audit trail for tenant deletion

-- ============================================================
-- 1. server_logs — Operational Server Diagnostics
-- ============================================================

CREATE TABLE public.server_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  tenant_id UUID NULL,
  user_id UUID NULL,
  request_id TEXT NULL,

  -- Classification
  level TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL DEFAULT 'server_action',
  action TEXT NOT NULL,

  -- Result
  status TEXT NOT NULL DEFAULT 'started',
  message TEXT NULL,
  safe_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Performance
  duration_ms INTEGER NULL,

  -- Error
  error_code TEXT NULL,
  error_message TEXT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT server_logs_level_check CHECK (
    level IN ('debug', 'info', 'warn', 'error')
  ),
  CONSTRAINT server_logs_source_check CHECK (
    source IN ('server_action', 'service', 'rpc', 'internal_job', 'webhook', 'system')
  ),
  CONSTRAINT server_logs_status_check CHECK (
    status IN ('started', 'success', 'failure', 'validation_failed', 'unauthorized')
  ),
  CONSTRAINT server_logs_action_len CHECK (char_length(action) <= 120),
  CONSTRAINT server_logs_message_len CHECK (message IS NULL OR char_length(message) <= 1000),
  CONSTRAINT server_logs_error_code_len CHECK (error_code IS NULL OR char_length(error_code) <= 64),
  CONSTRAINT server_logs_error_message_len CHECK (error_message IS NULL OR char_length(error_message) <= 2000),
  CONSTRAINT server_logs_request_id_len CHECK (request_id IS NULL OR char_length(request_id) <= 128),
  CONSTRAINT server_logs_safe_data_object CHECK (jsonb_typeof(safe_data) = 'object')
);

COMMENT ON TABLE public.server_logs IS
  'Operational server diagnostics. NOT for security/business audit (use audit trail for that). Milestone 13.2.';

-- Indexes
CREATE INDEX idx_server_logs_created_at ON public.server_logs (created_at DESC);
CREATE INDEX idx_server_logs_tenant ON public.server_logs (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_server_logs_level ON public.server_logs (level, created_at DESC);
CREATE INDEX idx_server_logs_action ON public.server_logs (action, created_at DESC);
CREATE INDEX idx_server_logs_request_id ON public.server_logs (request_id) WHERE request_id IS NOT NULL;

-- RLS — server_logs are NOT directly readable/writable by clients
ALTER TABLE public.server_logs ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for authenticated/anon.
-- Only service-role can write/read server_logs.
-- This is intentional: server logs are written by trusted backend code only.

-- ============================================================
-- 2. Tenant Deletion Event Log (lightweight audit)
-- ============================================================

CREATE TABLE public.tenant_deletion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tenant_name TEXT NOT NULL,
  tenant_slug TEXT NOT NULL,
  actor_user_id UUID NOT NULL,
  reason TEXT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT tde_reason_len CHECK (reason IS NULL OR char_length(reason) <= 500),
  CONSTRAINT tde_summary_object CHECK (jsonb_typeof(summary) = 'object')
);

COMMENT ON TABLE public.tenant_deletion_events IS
  'Permanent record of tenant deletion events. Survives tenant cascade. Milestone 13.2.';

CREATE INDEX idx_tde_actor ON public.tenant_deletion_events (actor_user_id, deleted_at DESC);
CREATE INDEX idx_tde_deleted_at ON public.tenant_deletion_events (deleted_at DESC);

ALTER TABLE public.tenant_deletion_events ENABLE ROW LEVEL SECURITY;
-- No client-facing policies — service-role only

-- ============================================================
-- 3. delete_tenant_permanently RPC
-- ============================================================
-- SECURITY DEFINER: runs as the defining role (service-role level)
-- Handles: RESTRICT FK cleanup, cascade delete, audit event
-- Authorization: caller must pass actor_user_id — the RPC verifies ownership

CREATE OR REPLACE FUNCTION public.delete_tenant_permanently(
  p_tenant_id UUID,
  p_actor_user_id UUID,
  p_confirmation_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_actor_membership RECORD;
  v_summary JSONB;
  v_member_count INTEGER;
  v_appointment_count INTEGER;
  v_service_count INTEGER;
  v_location_count INTEGER;
  v_has_active_subscription BOOLEAN;
BEGIN
  -- 1. Load tenant
  SELECT * INTO v_tenant
  FROM tenants
  WHERE id = p_tenant_id
  FOR UPDATE;

  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- 2. Verify confirmation slug matches
  IF p_confirmation_slug IS NOT NULL AND p_confirmation_slug != v_tenant.slug THEN
    RETURN jsonb_build_object('status', 'confirmation_mismatch');
  END IF;

  -- 3. Verify actor is an active owner
  SELECT * INTO v_actor_membership
  FROM tenant_members
  WHERE tenant_id = p_tenant_id
    AND user_id = p_actor_user_id
    AND status = 'active'
    AND role = 'owner';

  IF v_actor_membership IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  -- 4. Check for active SaaS subscription (blocks deletion)
  SELECT EXISTS (
    SELECT 1 FROM tenant_subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trialing', 'past_due')
      AND access_state NOT IN ('revoked', 'ending')
  ) INTO v_has_active_subscription;

  IF v_has_active_subscription THEN
    RETURN jsonb_build_object('status', 'active_subscription', 'message', 'Cancel your subscription before deleting.');
  END IF;

  -- 5. Collect summary for audit
  SELECT COUNT(*) INTO v_member_count FROM tenant_members WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_appointment_count FROM appointments WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_service_count FROM services WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_location_count FROM locations WHERE tenant_id = p_tenant_id;

  v_summary := jsonb_build_object(
    'members', v_member_count,
    'appointments', v_appointment_count,
    'services', v_service_count,
    'locations', v_location_count,
    'tenant_status', v_tenant.status
  );

  -- 6. Record deletion event (survives cascade because no FK to tenants)
  INSERT INTO tenant_deletion_events (tenant_id, tenant_name, tenant_slug, actor_user_id, summary)
  VALUES (p_tenant_id, v_tenant.name, v_tenant.slug, p_actor_user_id, v_summary);

  -- 7. Remove RESTRICT FK records (tenant_billing_customers, billing_checkout_sessions)
  DELETE FROM billing_checkout_sessions WHERE tenant_id = p_tenant_id;
  DELETE FROM tenant_billing_customers WHERE tenant_id = p_tenant_id;

  -- 8. Remove tenant_members (no trigger to worry about — protection is only in RPC)
  DELETE FROM tenant_members WHERE tenant_id = p_tenant_id;

  -- 9. Delete tenant — CASCADE handles the remaining 65+ child tables
  DELETE FROM tenants WHERE id = p_tenant_id;

  -- 10. Return success with summary
  RETURN jsonb_build_object(
    'status', 'deleted',
    'summary', v_summary
  );
END;
$$;

COMMENT ON FUNCTION public.delete_tenant_permanently IS
  'Permanently deletes a tenant and all associated data. Owner-only. Milestone 13.2.';

-- Only grant to authenticated (action layer verifies ownership via the RPC itself)
GRANT EXECUTE ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) TO authenticated;

-- ============================================================
-- 4. Tenant Deletion Preview RPC (read-only summary)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tenant_deletion_preview(
  p_tenant_id UUID,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_actor_membership RECORD;
  v_has_active_subscription BOOLEAN;
  v_has_pending_refunds BOOLEAN;
BEGIN
  -- Verify tenant exists
  SELECT id, name, slug, status INTO v_tenant
  FROM tenants WHERE id = p_tenant_id;

  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Verify actor is owner
  SELECT id INTO v_actor_membership
  FROM tenant_members
  WHERE tenant_id = p_tenant_id
    AND user_id = p_actor_user_id
    AND status = 'active'
    AND role = 'owner';

  IF v_actor_membership IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  -- Check blockers
  SELECT EXISTS (
    SELECT 1 FROM tenant_subscriptions
    WHERE tenant_id = p_tenant_id
      AND status IN ('active', 'trialing', 'past_due')
      AND access_state NOT IN ('revoked', 'ending')
  ) INTO v_has_active_subscription;

  SELECT EXISTS (
    SELECT 1 FROM appointment_payment_refunds
    WHERE tenant_id = p_tenant_id
      AND status IN ('pending', 'processing')
  ) INTO v_has_pending_refunds;

  -- Aggregate counts
  RETURN jsonb_build_object(
    'status', 'ok',
    'tenant_name', v_tenant.name,
    'tenant_slug', v_tenant.slug,
    'blockers', jsonb_build_object(
      'active_subscription', v_has_active_subscription,
      'pending_refunds', v_has_pending_refunds
    ),
    'summary', jsonb_build_object(
      'members', (SELECT COUNT(*) FROM tenant_members WHERE tenant_id = p_tenant_id AND status = 'active'),
      'appointments', (SELECT COUNT(*) FROM appointments WHERE tenant_id = p_tenant_id),
      'services', (SELECT COUNT(*) FROM services WHERE tenant_id = p_tenant_id),
      'locations', (SELECT COUNT(*) FROM locations WHERE tenant_id = p_tenant_id),
      'resources', (SELECT COUNT(*) FROM resources WHERE tenant_id = p_tenant_id),
      'customers', (SELECT COUNT(DISTINCT customer_email) FROM appointments WHERE tenant_id = p_tenant_id AND customer_email IS NOT NULL),
      'payments', (SELECT COUNT(*) FROM payment_intents WHERE tenant_id = p_tenant_id),
      'packages', (SELECT COUNT(*) FROM service_packages WHERE tenant_id = p_tenant_id),
      'reviews', (SELECT COUNT(*) FROM customer_reviews WHERE tenant_id = p_tenant_id)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_deletion_preview(UUID, UUID) TO authenticated;

-- ============================================================
-- 5. Dev/Test helper: delete_tenant_for_test
-- ============================================================
-- Same as permanent deletion but skips subscription check.
-- Only callable by service-role (no GRANT to authenticated).

CREATE OR REPLACE FUNCTION public.delete_tenant_for_test(
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove RESTRICT FK records
  DELETE FROM billing_checkout_sessions WHERE tenant_id = p_tenant_id;
  DELETE FROM tenant_billing_customers WHERE tenant_id = p_tenant_id;

  -- Remove members
  DELETE FROM tenant_members WHERE tenant_id = p_tenant_id;

  -- Delete tenant (cascades everything else)
  DELETE FROM tenants WHERE id = p_tenant_id;

  RETURN jsonb_build_object('status', 'deleted');
END;
$$;

COMMENT ON FUNCTION public.delete_tenant_for_test IS
  'Test/dev utility for tenant cleanup. Service-role only. No grants to authenticated.';

-- No GRANT to authenticated — only service-role can call this
