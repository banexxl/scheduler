-- Migration: Polar Subscription Lifecycle and Tenant Projection (Milestone 7.3)

-- ============================================================
-- PART A: Tenant Subscription Projection
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tenant_subscriptions'
  ) THEN
    CREATE TABLE public.tenant_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
      tenant_billing_customer_id uuid NOT NULL REFERENCES public.tenant_billing_customers(id) ON DELETE RESTRICT,
      billing_plan_id uuid NULL REFERENCES public.billing_plans(id) ON DELETE SET NULL,
      billing_plan_price_id uuid NULL REFERENCES public.billing_plan_prices(id) ON DELETE SET NULL,
      polar_subscription_id uuid NOT NULL,
      polar_customer_id uuid NOT NULL,
      polar_product_id uuid NOT NULL,
      polar_price_id uuid NULL,
      polar_checkout_id uuid NULL,
      status text NOT NULL,
      access_state text NOT NULL,
      billing_interval text NULL,
      billing_interval_count integer NULL,
      amount integer NULL,
      currency text NULL,
      quantity integer NULL,
      current_period_start timestamptz NULL,
      current_period_end timestamptz NULL,
      trial_start timestamptz NULL,
      trial_end timestamptz NULL,
      started_at timestamptz NULL,
      cancel_at_period_end boolean NOT NULL DEFAULT false,
      canceled_at timestamptz NULL,
      ends_at timestamptz NULL,
      ended_at timestamptz NULL,
      customer_cancellation_reason text NULL,
      customer_cancellation_comment text NULL,
      polar_created_at timestamptz NULL,
      polar_modified_at timestamptz NULL,
      last_event_at timestamptz NULL,
      last_event_id text NULL,
      last_synced_at timestamptz NOT NULL DEFAULT now(),
      sync_status text NOT NULL DEFAULT 'synced',
      sync_error_code text NULL,
      sync_error_message text NULL,
      subscription_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tenant_subscriptions_polar_subscription_unique UNIQUE (polar_subscription_id),
      CONSTRAINT tenant_subscriptions_status_check CHECK (
        status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'unknown')
      ),
      CONSTRAINT tenant_subscriptions_access_state_check CHECK (
        access_state IN ('pending', 'trial', 'active', 'grace_period', 'ending', 'revoked')
      ),
      CONSTRAINT tenant_subscriptions_billing_interval_check CHECK (
        billing_interval IS NULL OR lower(billing_interval) IN ('day', 'week', 'month', 'year')
      ),
      CONSTRAINT tenant_subscriptions_billing_interval_count_check CHECK (
        billing_interval_count IS NULL OR billing_interval_count > 0
      ),
      CONSTRAINT tenant_subscriptions_amount_check CHECK (
        amount IS NULL OR amount >= 0
      ),
      CONSTRAINT tenant_subscriptions_currency_check CHECK (
        currency IS NULL OR currency ~ '^[A-Z]{3}$'
      ),
      CONSTRAINT tenant_subscriptions_quantity_check CHECK (
        quantity IS NULL OR quantity > 0
      ),
      CONSTRAINT tenant_subscriptions_metadata_object_check CHECK (
        jsonb_typeof(subscription_metadata) = 'object'
      ),
      CONSTRAINT tenant_subscriptions_sync_status_check CHECK (
        sync_status IN ('synced', 'requires_mapping', 'unresolved_customer', 'stale_event', 'conflict', 'failed')
      ),
      CONSTRAINT tenant_subscriptions_reason_len_check CHECK (
        customer_cancellation_reason IS NULL OR char_length(customer_cancellation_reason) <= 255
      ),
      CONSTRAINT tenant_subscriptions_comment_len_check CHECK (
        customer_cancellation_comment IS NULL OR char_length(customer_cancellation_comment) <= 2000
      ),
      CONSTRAINT tenant_subscriptions_error_code_len_check CHECK (
        sync_error_code IS NULL OR char_length(sync_error_code) <= 120
      ),
      CONSTRAINT tenant_subscriptions_error_message_len_check CHECK (
        sync_error_message IS NULL OR char_length(sync_error_message) <= 1000
      ),
      CONSTRAINT tenant_subscriptions_period_order_check CHECK (
        current_period_start IS NULL OR current_period_end IS NULL OR current_period_start < current_period_end
      ),
      CONSTRAINT tenant_subscriptions_trial_order_check CHECK (
        trial_start IS NULL OR trial_end IS NULL OR trial_start < trial_end
      ),
      CONSTRAINT tenant_subscriptions_lifecycle_order_check CHECK (
        started_at IS NULL OR ended_at IS NULL OR started_at <= ended_at
      )
    );
  END IF;
END $$;

ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS tenant_billing_customer_id uuid,
  ADD COLUMN IF NOT EXISTS billing_plan_id uuid,
  ADD COLUMN IF NOT EXISTS billing_plan_price_id uuid,
  ADD COLUMN IF NOT EXISTS polar_subscription_id uuid,
  ADD COLUMN IF NOT EXISTS polar_customer_id uuid,
  ADD COLUMN IF NOT EXISTS polar_product_id uuid,
  ADD COLUMN IF NOT EXISTS polar_price_id uuid,
  ADD COLUMN IF NOT EXISTS polar_checkout_id uuid,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS access_state text,
  ADD COLUMN IF NOT EXISTS billing_interval text,
  ADD COLUMN IF NOT EXISTS billing_interval_count integer,
  ADD COLUMN IF NOT EXISTS amount integer,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS quantity integer,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_cancellation_reason text,
  ADD COLUMN IF NOT EXISTS customer_cancellation_comment text,
  ADD COLUMN IF NOT EXISTS polar_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS polar_modified_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_event_id text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_status text,
  ADD COLUMN IF NOT EXISTS sync_error_code text,
  ADD COLUMN IF NOT EXISTS sync_error_message text,
  ADD COLUMN IF NOT EXISTS subscription_metadata jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.tenant_subscriptions
SET status = COALESCE(status, 'unknown'),
    access_state = COALESCE(access_state, 'revoked'),
    sync_status = COALESCE(sync_status, 'synced'),
    last_synced_at = COALESCE(last_synced_at, now()),
    subscription_metadata = COALESCE(subscription_metadata, '{}'::jsonb),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE id IS NOT NULL;

ALTER TABLE public.tenant_subscriptions
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN access_state SET NOT NULL,
  ALTER COLUMN sync_status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'unknown',
  ALTER COLUMN access_state SET DEFAULT 'revoked',
  ALTER COLUMN sync_status SET DEFAULT 'synced',
  ALTER COLUMN last_synced_at SET DEFAULT now(),
  ALTER COLUMN subscription_metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id
  ON public.tenant_subscriptions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_polar_customer_id
  ON public.tenant_subscriptions (polar_customer_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_polar_product_id
  ON public.tenant_subscriptions (polar_product_id);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_polar_price_id
  ON public.tenant_subscriptions (polar_price_id)
  WHERE polar_price_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_access_state
  ON public.tenant_subscriptions (tenant_id, access_state);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_status
  ON public.tenant_subscriptions (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_period_end
  ON public.tenant_subscriptions (tenant_id, current_period_end DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_access_period_end
  ON public.tenant_subscriptions (access_state, current_period_end DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_sync_status_last_synced
  ON public.tenant_subscriptions (sync_status, last_synced_at DESC);

CREATE TRIGGER trg_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART B: Optional State History
-- ============================================================

CREATE TABLE public.billing_subscription_state_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_subscription_id uuid NOT NULL REFERENCES public.tenant_subscriptions(id) ON DELETE CASCADE,
  polar_event_id text NULL,
  previous_status text NULL,
  new_status text NOT NULL,
  previous_access_state text NULL,
  new_access_state text NOT NULL,
  effective_at timestamptz NOT NULL,
  change_source text NOT NULL,
  change_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_subscription_state_history_change_source_check CHECK (
    change_source IN ('webhook', 'reconciliation', 'manual_refresh')
  ),
  CONSTRAINT billing_subscription_state_history_summary_object_check CHECK (
    jsonb_typeof(change_summary) = 'object'
  )
);

CREATE UNIQUE INDEX uq_subscription_state_history_event_once
  ON public.billing_subscription_state_history (tenant_subscription_id, polar_event_id)
  WHERE polar_event_id IS NOT NULL;

CREATE INDEX idx_subscription_state_history_tenant_subscription_time
  ON public.billing_subscription_state_history (tenant_subscription_id, effective_at DESC);

-- ============================================================
-- PART C: Consistency and Invariants
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_tenant_subscription_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_customer public.tenant_billing_customers%ROWTYPE;
  v_plan public.billing_plans%ROWTYPE;
  v_price public.billing_plan_prices%ROWTYPE;
  v_checkout public.billing_checkout_sessions%ROWTYPE;
  v_conflicting_effective_count integer;
BEGIN
  SELECT *
  INTO v_customer
  FROM public.tenant_billing_customers
  WHERE id = NEW.tenant_billing_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing customer does not exist.';
  END IF;

  IF v_customer.tenant_id <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Billing customer does not belong to tenant.';
  END IF;

  IF v_customer.polar_customer_id <> NEW.polar_customer_id THEN
    RAISE EXCEPTION 'Billing customer Polar id mismatch.';
  END IF;

  IF NEW.billing_plan_price_id IS NOT NULL AND NEW.billing_plan_id IS NULL THEN
    RAISE EXCEPTION 'Billing plan is required when billing plan price is set.';
  END IF;

  IF NEW.billing_plan_id IS NOT NULL THEN
    SELECT *
    INTO v_plan
    FROM public.billing_plans
    WHERE id = NEW.billing_plan_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Billing plan does not exist.';
    END IF;

    IF v_plan.polar_product_id IS NOT NULL AND v_plan.polar_product_id <> NEW.polar_product_id THEN
      RAISE EXCEPTION 'Billing plan mapping does not match subscription product.';
    END IF;
  END IF;

  IF NEW.billing_plan_price_id IS NOT NULL THEN
    SELECT *
    INTO v_price
    FROM public.billing_plan_prices
    WHERE id = NEW.billing_plan_price_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Billing plan price does not exist.';
    END IF;

    IF v_price.billing_plan_id <> NEW.billing_plan_id THEN
      RAISE EXCEPTION 'Billing plan price does not belong to billing plan.';
    END IF;

    IF v_price.polar_product_id <> NEW.polar_product_id THEN
      RAISE EXCEPTION 'Billing plan price product mismatch.';
    END IF;

    IF NEW.polar_price_id IS NOT NULL AND v_price.polar_price_id <> NEW.polar_price_id THEN
      RAISE EXCEPTION 'Billing plan price Polar id mismatch.';
    END IF;
  END IF;

  IF NEW.polar_checkout_id IS NOT NULL THEN
    SELECT *
    INTO v_checkout
    FROM public.billing_checkout_sessions
    WHERE polar_checkout_id = NEW.polar_checkout_id;

    IF FOUND THEN
      IF v_checkout.tenant_id <> NEW.tenant_id THEN
        RAISE EXCEPTION 'Checkout does not belong to tenant.';
      END IF;

      IF v_checkout.polar_product_id <> NEW.polar_product_id THEN
        RAISE EXCEPTION 'Checkout product mismatch.';
      END IF;

      IF NEW.polar_price_id IS NOT NULL
         AND v_checkout.polar_price_id <> NEW.polar_price_id THEN
        RAISE EXCEPTION 'Checkout price mismatch.';
      END IF;
    END IF;
  END IF;

  IF NEW.access_state IN ('trial', 'active', 'grace_period', 'ending') THEN
    SELECT count(*)
    INTO v_conflicting_effective_count
    FROM public.tenant_subscriptions ts
    WHERE ts.tenant_id = NEW.tenant_id
      AND ts.id <> NEW.id
      AND ts.access_state IN ('trial', 'active', 'grace_period', 'ending');

    IF v_conflicting_effective_count > 0 THEN
      RAISE EXCEPTION 'Tenant already has an effective subscription projection.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_tenant_subscription_relationships
  BEFORE INSERT OR UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.verify_tenant_subscription_relationships();

-- ============================================================
-- PART D: RLS
-- ============================================================

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscription_state_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_subscriptions_owner_admin_select
  ON public.tenant_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_subscriptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY billing_subscription_state_history_owner_admin_select
  ON public.billing_subscription_state_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenant_members tm
      WHERE tm.tenant_id = billing_subscription_state_history.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

REVOKE ALL ON TABLE public.tenant_subscriptions FROM anon;
REVOKE ALL ON TABLE public.tenant_subscriptions FROM authenticated;
REVOKE ALL ON TABLE public.billing_subscription_state_history FROM anon;
REVOKE ALL ON TABLE public.billing_subscription_state_history FROM authenticated;

COMMENT ON TABLE public.tenant_subscriptions IS
  'Tenant-scoped local projection of Polar subscription lifecycle state.';

COMMENT ON TABLE public.billing_subscription_state_history IS
  'Optional normalized subscription state transition history.';
