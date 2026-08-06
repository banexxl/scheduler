-- Migration: Polar Checkout + Billing Customers (Milestone 7.2)
-- Adds tenant billing-customer mapping and local checkout-session tracking.

-- ============================================================
-- PART A: Tenant Billing Customers
-- ============================================================

CREATE TABLE public.tenant_billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  polar_customer_id uuid NOT NULL,
  external_id text NOT NULL,
  email text NULL,
  name text NULL,
  customer_type text NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  customer_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  polar_created_at timestamptz NULL,
  polar_modified_at timestamptz NULL,
  last_event_at timestamptz NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_billing_customers_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT tenant_billing_customers_polar_customer_unique UNIQUE (polar_customer_id),
  CONSTRAINT tenant_billing_customers_external_id_unique UNIQUE (external_id),
  CONSTRAINT tenant_billing_customers_external_id_len CHECK (char_length(external_id) BETWEEN 10 AND 120),
  CONSTRAINT tenant_billing_customers_external_id_format CHECK (
    external_id ~ '^tenant:[0-9a-fA-F-]{36}$'
  ),
  CONSTRAINT tenant_billing_customers_email_len CHECK (
    email IS NULL OR char_length(email) <= 320
  ),
  CONSTRAINT tenant_billing_customers_email_format CHECK (
    email IS NULL OR email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  CONSTRAINT tenant_billing_customers_name_len CHECK (
    name IS NULL OR char_length(name) <= 200
  ),
  CONSTRAINT tenant_billing_customers_customer_type_len CHECK (
    customer_type IS NULL OR char_length(customer_type) <= 64
  ),
  CONSTRAINT tenant_billing_customers_metadata_object CHECK (
    jsonb_typeof(customer_metadata) = 'object'
  )
);

CREATE INDEX idx_tenant_billing_customers_last_event_at
  ON public.tenant_billing_customers (last_event_at DESC);

CREATE INDEX idx_tenant_billing_customers_last_synced_at
  ON public.tenant_billing_customers (last_synced_at DESC);

CREATE TRIGGER trg_tenant_billing_customers_updated_at
  BEFORE UPDATE ON public.tenant_billing_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART B: Billing Checkout Sessions
-- ============================================================

CREATE TABLE public.billing_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL,
  billing_plan_id uuid NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  billing_plan_price_id uuid NOT NULL REFERENCES public.billing_plan_prices(id) ON DELETE RESTRICT,
  polar_checkout_id uuid NULL,
  polar_product_id uuid NOT NULL,
  polar_price_id uuid NOT NULL,
  external_customer_id text NOT NULL,
  status text NOT NULL DEFAULT 'creating',
  checkout_url text NULL,
  success_url text NOT NULL,
  return_url text NOT NULL,
  request_key uuid NOT NULL,
  checkout_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NULL,
  completed_at timestamptz NULL,
  polar_created_at timestamptz NULL,
  polar_modified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_checkout_sessions_tenant_request_unique UNIQUE (tenant_id, request_key),
  CONSTRAINT billing_checkout_sessions_polar_checkout_unique UNIQUE (polar_checkout_id),
  CONSTRAINT billing_checkout_sessions_status_check CHECK (
    status IN ('creating', 'open', 'updated', 'expired', 'completed', 'failed')
  ),
  CONSTRAINT billing_checkout_sessions_external_customer_len CHECK (
    char_length(external_customer_id) BETWEEN 10 AND 120
  ),
  CONSTRAINT billing_checkout_sessions_external_customer_format CHECK (
    external_customer_id ~ '^tenant:[0-9a-fA-F-]{36}$'
  ),
  CONSTRAINT billing_checkout_sessions_metadata_object CHECK (
    jsonb_typeof(checkout_metadata) = 'object'
  ),
  CONSTRAINT billing_checkout_sessions_checkout_url_len CHECK (
    checkout_url IS NULL OR char_length(checkout_url) <= 2048
  ),
  CONSTRAINT billing_checkout_sessions_success_url_len CHECK (
    char_length(success_url) <= 2048
  ),
  CONSTRAINT billing_checkout_sessions_return_url_len CHECK (
    char_length(return_url) <= 2048
  ),
  CONSTRAINT billing_checkout_sessions_completed_requires_timestamp CHECK (
    status <> 'completed' OR completed_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX uq_billing_checkout_sessions_polar_checkout_non_null
  ON public.billing_checkout_sessions (polar_checkout_id)
  WHERE polar_checkout_id IS NOT NULL;

CREATE INDEX idx_billing_checkout_sessions_tenant_created
  ON public.billing_checkout_sessions (tenant_id, created_at DESC);

CREATE INDEX idx_billing_checkout_sessions_status
  ON public.billing_checkout_sessions (status, created_at DESC);

CREATE INDEX idx_billing_checkout_sessions_polar_price
  ON public.billing_checkout_sessions (polar_price_id, created_at DESC);

CREATE TRIGGER trg_billing_checkout_sessions_updated_at
  BEFORE UPDATE ON public.billing_checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART C: Tenant Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_billing_checkout_session_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_price_record public.billing_plan_prices%ROWTYPE;
  v_plan_record public.billing_plans%ROWTYPE;
  v_membership_exists boolean;
BEGIN
  SELECT *
  INTO v_price_record
  FROM public.billing_plan_prices
  WHERE id = NEW.billing_plan_price_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected billing plan price does not exist.';
  END IF;

  SELECT *
  INTO v_plan_record
  FROM public.billing_plans
  WHERE id = NEW.billing_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected billing plan does not exist.';
  END IF;

  IF v_price_record.billing_plan_id <> NEW.billing_plan_id THEN
    RAISE EXCEPTION 'Price does not belong to selected billing plan.';
  END IF;

  IF v_price_record.polar_product_id <> NEW.polar_product_id THEN
    RAISE EXCEPTION 'Polar product id does not match selected local price.';
  END IF;

  IF v_price_record.polar_price_id <> NEW.polar_price_id THEN
    RAISE EXCEPTION 'Polar price id does not match selected local price.';
  END IF;

  IF NEW.external_customer_id <> ('tenant:' || NEW.tenant_id::text) THEN
    RAISE EXCEPTION 'External customer id must match tenant id.';
  END IF;

  IF v_plan_record.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Selected plan is not active.';
  END IF;

  IF v_plan_record.is_free IS TRUE THEN
    RAISE EXCEPTION 'Free plans cannot be used for Polar checkout sessions.';
  END IF;

  IF v_price_record.is_active IS NOT TRUE OR v_price_record.is_archived IS TRUE THEN
    RAISE EXCEPTION 'Selected price is not active for checkout.';
  END IF;

  IF v_price_record.is_checkout_eligible IS NOT TRUE THEN
    RAISE EXCEPTION 'Selected price is not checkout eligible.';
  END IF;

  IF NEW.success_url !~* '^https?://'
     OR NEW.return_url !~* '^https?://' THEN
    RAISE EXCEPTION 'Checkout callback URLs must be absolute HTTP(S) URLs.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.tenant_id = NEW.tenant_id
      AND tm.user_id = NEW.requested_by
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    RAISE EXCEPTION 'Requester must be an active owner/admin of the tenant.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_billing_checkout_session_consistency
  BEFORE INSERT OR UPDATE ON public.billing_checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.verify_billing_checkout_session_consistency();

-- ============================================================
-- PART D: RLS
-- ============================================================

ALTER TABLE public.tenant_billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_billing_customers_owner_admin_select
  ON public.tenant_billing_customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_billing_customers.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY billing_checkout_sessions_owner_admin_select
  ON public.billing_checkout_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = billing_checkout_sessions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

REVOKE ALL ON TABLE public.tenant_billing_customers FROM anon;
REVOKE ALL ON TABLE public.tenant_billing_customers FROM authenticated;
REVOKE ALL ON TABLE public.billing_checkout_sessions FROM anon;
REVOKE ALL ON TABLE public.billing_checkout_sessions FROM authenticated;

COMMENT ON TABLE public.tenant_billing_customers IS
  'Per-tenant billing customer mapping to Polar customer identities.';

COMMENT ON TABLE public.billing_checkout_sessions IS
  'Local tracking of Polar hosted checkout sessions and idempotent request keys.';
