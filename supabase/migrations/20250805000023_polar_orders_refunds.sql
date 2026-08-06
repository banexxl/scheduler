-- Migration: Polar Orders, Refunds, and Financial Projections (Milestone 7.4)
-- Introduces local billing-order and billing-refund projection tables plus
-- relationship guards and read-only RLS policies.

-- ============================================================
-- PART A: Billing Orders (payment history projection)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_billing_customer_id uuid NOT NULL REFERENCES public.tenant_billing_customers(id) ON DELETE RESTRICT,
  tenant_subscription_id uuid NULL REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  billing_plan_id uuid NULL REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  billing_plan_price_id uuid NULL REFERENCES public.billing_plan_prices(id) ON DELETE SET NULL,
  polar_order_id uuid NOT NULL,
  polar_customer_id uuid NOT NULL,
  polar_subscription_id uuid NULL,
  polar_product_id uuid NULL,
  polar_price_id uuid NULL,
  polar_checkout_id uuid NULL,
  status text NOT NULL,
  billing_reason text NULL,
  is_paid boolean NOT NULL DEFAULT false,
  subtotal_amount integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL DEFAULT 0,
  tax_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL DEFAULT 0,
  refunded_amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL,
  order_number text NULL,
  invoice_number text NULL,
  invoice_url text NULL,
  receipt_url text NULL,
  paid_at timestamptz NULL,
  polar_created_at timestamptz NULL,
  polar_modified_at timestamptz NULL,
  last_event_at timestamptz NULL,
  last_event_id text NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_status text NOT NULL DEFAULT 'synced',
  sync_error_code text NULL,
  sync_error_message text NULL,
  order_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_orders_polar_order_unique UNIQUE (polar_order_id),
  CONSTRAINT billing_orders_status_len CHECK (char_length(status) BETWEEN 1 AND 64),
  CONSTRAINT billing_orders_reason_len CHECK (billing_reason IS NULL OR char_length(billing_reason) <= 64),
  CONSTRAINT billing_orders_amounts_non_negative CHECK (
    subtotal_amount >= 0
    AND discount_amount >= 0
    AND net_amount >= 0
    AND tax_amount >= 0
    AND total_amount >= 0
    AND refunded_amount >= 0
  ),
  CONSTRAINT billing_orders_refunded_not_exceed_total CHECK (
    refunded_amount <= total_amount
  ),
  CONSTRAINT billing_orders_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT billing_orders_order_number_len CHECK (order_number IS NULL OR char_length(order_number) <= 120),
  CONSTRAINT billing_orders_invoice_number_len CHECK (invoice_number IS NULL OR char_length(invoice_number) <= 120),
  CONSTRAINT billing_orders_invoice_url_len CHECK (invoice_url IS NULL OR char_length(invoice_url) <= 2048),
  CONSTRAINT billing_orders_receipt_url_len CHECK (receipt_url IS NULL OR char_length(receipt_url) <= 2048),
  CONSTRAINT billing_orders_metadata_object CHECK (jsonb_typeof(order_metadata) = 'object'),
  CONSTRAINT billing_orders_sync_status_check CHECK (
    sync_status IN ('synced', 'requires_mapping', 'unresolved_customer', 'stale_event', 'conflict', 'failed')
  ),
  CONSTRAINT billing_orders_error_code_len CHECK (
    sync_error_code IS NULL OR char_length(sync_error_code) <= 120
  ),
  CONSTRAINT billing_orders_error_message_len CHECK (
    sync_error_message IS NULL OR char_length(sync_error_message) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_billing_orders_tenant_created
  ON public.billing_orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_orders_tenant_subscription
  ON public.billing_orders (tenant_subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_orders_paid_status
  ON public.billing_orders (is_paid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_orders_sync_status_last_synced
  ON public.billing_orders (sync_status, last_synced_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_orders_polar_customer
  ON public.billing_orders (polar_customer_id, created_at DESC);

CREATE TRIGGER trg_billing_orders_updated_at
  BEFORE UPDATE ON public.billing_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART B: Billing Refunds
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_order_id uuid NOT NULL REFERENCES public.billing_orders(id) ON DELETE CASCADE,
  polar_refund_id uuid NOT NULL,
  polar_order_id uuid NOT NULL,
  status text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  reason text NULL,
  provider_reason text NULL,
  polar_created_at timestamptz NULL,
  polar_modified_at timestamptz NULL,
  last_event_at timestamptz NULL,
  last_event_id text NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_status text NOT NULL DEFAULT 'synced',
  sync_error_code text NULL,
  sync_error_message text NULL,
  refund_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_refunds_polar_refund_unique UNIQUE (polar_refund_id),
  CONSTRAINT billing_refunds_status_len CHECK (char_length(status) BETWEEN 1 AND 64),
  CONSTRAINT billing_refunds_amount_positive CHECK (amount > 0),
  CONSTRAINT billing_refunds_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT billing_refunds_reason_len CHECK (reason IS NULL OR char_length(reason) <= 64),
  CONSTRAINT billing_refunds_provider_reason_len CHECK (provider_reason IS NULL OR char_length(provider_reason) <= 255),
  CONSTRAINT billing_refunds_metadata_object CHECK (jsonb_typeof(refund_metadata) = 'object'),
  CONSTRAINT billing_refunds_sync_status_check CHECK (
    sync_status IN ('synced', 'stale_event', 'conflict', 'failed')
  ),
  CONSTRAINT billing_refunds_error_code_len CHECK (
    sync_error_code IS NULL OR char_length(sync_error_code) <= 120
  ),
  CONSTRAINT billing_refunds_error_message_len CHECK (
    sync_error_message IS NULL OR char_length(sync_error_message) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS idx_billing_refunds_order_created
  ON public.billing_refunds (billing_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_refunds_tenant_created
  ON public.billing_refunds (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_refunds_status_last_synced
  ON public.billing_refunds (status, last_synced_at DESC);

CREATE TRIGGER trg_billing_refunds_updated_at
  BEFORE UPDATE ON public.billing_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART C: Optional financial-history table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_financial_state_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_order_id uuid NOT NULL REFERENCES public.billing_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  previous_status text NULL,
  new_status text NOT NULL,
  previous_paid_state boolean NULL,
  new_paid_state boolean NOT NULL,
  previous_refunded_amount integer NULL,
  new_refunded_amount integer NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  change_source text NOT NULL DEFAULT 'webhook',
  change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_financial_state_history_event_type_len CHECK (char_length(event_type) BETWEEN 1 AND 64),
  CONSTRAINT billing_financial_state_history_source_check CHECK (
    change_source IN ('webhook', 'reconciliation', 'manual_refresh')
  ),
  CONSTRAINT billing_financial_state_history_summary_object CHECK (jsonb_typeof(change_summary) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_billing_financial_state_history_order_time
  ON public.billing_financial_state_history (billing_order_id, effective_at DESC);

-- ============================================================
-- PART D: Relationship validation triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_billing_order_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer public.tenant_billing_customers%ROWTYPE;
  v_subscription public.tenant_subscriptions%ROWTYPE;
  v_plan public.billing_plans%ROWTYPE;
  v_price public.billing_plan_prices%ROWTYPE;
BEGIN
  SELECT * INTO v_customer
  FROM public.tenant_billing_customers
  WHERE id = NEW.tenant_billing_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing customer does not exist.';
  END IF;

  IF v_customer.tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Billing customer does not belong to tenant.';
  END IF;

  IF NEW.polar_customer_id IS NOT NULL AND v_customer.polar_customer_id <> NEW.polar_customer_id THEN
    RAISE EXCEPTION 'Polar customer id does not match billing customer projection.';
  END IF;

  IF NEW.tenant_subscription_id IS NOT NULL THEN
    SELECT * INTO v_subscription
    FROM public.tenant_subscriptions
    WHERE id = NEW.tenant_subscription_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Subscription does not exist.';
    END IF;

    IF v_subscription.tenant_id <> NEW.tenant_id THEN
      RAISE EXCEPTION 'Subscription does not belong to tenant.';
    END IF;

    IF NEW.polar_subscription_id IS NOT NULL AND v_subscription.polar_subscription_id IS DISTINCT FROM NEW.polar_subscription_id THEN
      RAISE EXCEPTION 'Polar subscription id does not match subscription projection.';
    END IF;
  END IF;

  IF NEW.billing_plan_id IS NOT NULL AND NEW.billing_plan_price_id IS NOT NULL THEN
    SELECT * INTO v_price
    FROM public.billing_plan_prices
    WHERE id = NEW.billing_plan_price_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Billing plan price does not exist.';
    END IF;

    IF v_price.billing_plan_id <> NEW.billing_plan_id THEN
      RAISE EXCEPTION 'Billing plan price does not belong to selected billing plan.';
    END IF;

    IF NEW.polar_price_id IS NOT NULL AND v_price.polar_price_id IS DISTINCT FROM NEW.polar_price_id THEN
      RAISE EXCEPTION 'Polar price id does not match selected billing plan price.';
    END IF;
  END IF;

  IF NEW.billing_plan_id IS NOT NULL THEN
    SELECT * INTO v_plan
    FROM public.billing_plans
    WHERE id = NEW.billing_plan_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Billing plan does not exist.';
    END IF;

    IF NEW.polar_product_id IS NOT NULL AND v_plan.polar_product_id IS NOT NULL AND v_plan.polar_product_id IS DISTINCT FROM NEW.polar_product_id THEN
      RAISE EXCEPTION 'Polar product id does not match selected billing plan.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_billing_order_relationships
  BEFORE INSERT OR UPDATE ON public.billing_orders
  FOR EACH ROW EXECUTE FUNCTION public.verify_billing_order_relationships();

CREATE OR REPLACE FUNCTION public.verify_billing_refund_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.billing_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM public.billing_orders
  WHERE id = NEW.billing_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing order does not exist.';
  END IF;

  IF v_order.tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Refund tenant does not match billing order tenant.';
  END IF;

  IF v_order.polar_order_id IS DISTINCT FROM NEW.polar_order_id THEN
    RAISE EXCEPTION 'Polar order id does not match billing order.';
  END IF;

  IF v_order.currency IS DISTINCT FROM NEW.currency THEN
    RAISE EXCEPTION 'Refund currency does not match billing order currency.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_billing_refund_relationships
  BEFORE INSERT OR UPDATE ON public.billing_refunds
  FOR EACH ROW EXECUTE FUNCTION public.verify_billing_refund_relationships();

-- ============================================================
-- PART E: RLS
-- ============================================================

ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_orders_owner_admin_select
  ON public.billing_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = billing_orders.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY billing_refunds_owner_admin_select
  ON public.billing_refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = billing_refunds.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

REVOKE ALL ON TABLE public.billing_orders FROM anon;
REVOKE ALL ON TABLE public.billing_orders FROM authenticated;
REVOKE ALL ON TABLE public.billing_refunds FROM anon;
REVOKE ALL ON TABLE public.billing_refunds FROM authenticated;

COMMENT ON TABLE public.billing_orders IS
  'Local projection of Polar orders used for tenant billing history and platform diagnostics.';

COMMENT ON TABLE public.billing_refunds IS
  'Local projection of Polar refunds linked to billing orders.';
