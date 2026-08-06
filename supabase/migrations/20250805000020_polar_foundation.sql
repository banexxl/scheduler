-- Migration: Polar Foundation, Products, Prices, and Webhook Ingestion (Milestone 7.1)
-- Establishes local billing-plan catalog, Polar product/price synchronization,
-- durable webhook storage, and idempotent webhook claiming primitives.

-- ============================================================
-- PART A: Billing Plans
-- ============================================================

CREATE TABLE public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  name text NOT NULL,
  description text NULL,
  polar_product_id uuid NULL,
  polar_product_name text NULL,
  polar_product_description text NULL,
  is_free boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  product_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  polar_created_at timestamptz NULL,
  polar_modified_at timestamptz NULL,
  last_synced_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_plans_plan_key_unique UNIQUE (plan_key),
  CONSTRAINT billing_plans_plan_key_format CHECK (plan_key ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT billing_plans_name_len CHECK (char_length(name) BETWEEN 2 AND 120),
  CONSTRAINT billing_plans_description_len CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT billing_plans_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT billing_plans_product_metadata_object CHECK (jsonb_typeof(product_metadata) = 'object')
);

CREATE UNIQUE INDEX uq_billing_plans_polar_product_non_null
  ON public.billing_plans (polar_product_id)
  WHERE polar_product_id IS NOT NULL;

CREATE INDEX idx_billing_plans_sort_order
  ON public.billing_plans (sort_order, plan_key);

CREATE INDEX idx_billing_plans_active_public
  ON public.billing_plans (is_active, is_public, sort_order)
  WHERE is_active = true;

CREATE TRIGGER trg_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed stable local plan keys. Free plan intentionally has no Polar product mapping.
INSERT INTO public.billing_plans (
  plan_key,
  name,
  description,
  is_free,
  is_active,
  is_public,
  sort_order,
  product_metadata
)
VALUES
  (
    'free',
    'Free',
    'Starter access for small teams and evaluation.',
    true,
    true,
    true,
    0,
    '{"application":"scheduling-platform","plan_key":"free"}'::jsonb
  ),
  (
    'starter',
    'Starter',
    'Core scheduling features for growing businesses.',
    false,
    true,
    true,
    10,
    '{"application":"scheduling-platform","plan_key":"starter"}'::jsonb
  ),
  (
    'professional',
    'Professional',
    'Advanced operations and automation for scaling teams.',
    false,
    true,
    true,
    20,
    '{"application":"scheduling-platform","plan_key":"professional"}'::jsonb
  ),
  (
    'business',
    'Business',
    'High-capacity plan with premium support.',
    false,
    true,
    true,
    30,
    '{"application":"scheduling-platform","plan_key":"business"}'::jsonb
  )
ON CONFLICT (plan_key) DO NOTHING;

-- ============================================================
-- PART B: Billing Plan Prices
-- ============================================================

CREATE TABLE public.billing_plan_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_plan_id uuid NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  polar_product_id uuid NOT NULL,
  polar_price_id uuid NOT NULL,
  price_type text NOT NULL,
  billing_interval text NULL,
  billing_interval_count integer NULL,
  amount integer NULL,
  currency text NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  is_checkout_eligible boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  price_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  polar_created_at timestamptz NULL,
  polar_modified_at timestamptz NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_plan_prices_polar_price_unique UNIQUE (polar_price_id),
  CONSTRAINT billing_plan_prices_amount_non_negative CHECK (amount IS NULL OR amount >= 0),
  CONSTRAINT billing_plan_prices_currency_format CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  CONSTRAINT billing_plan_prices_interval_count_positive CHECK (
    billing_interval_count IS NULL OR billing_interval_count > 0
  ),
  CONSTRAINT billing_plan_prices_price_metadata_object CHECK (jsonb_typeof(price_metadata) = 'object'),
  CONSTRAINT billing_plan_prices_price_type_len CHECK (char_length(price_type) BETWEEN 1 AND 64)
);

CREATE INDEX idx_billing_plan_prices_plan
  ON public.billing_plan_prices (billing_plan_id, is_active, is_archived);

CREATE INDEX idx_billing_plan_prices_product
  ON public.billing_plan_prices (polar_product_id, is_active);

CREATE INDEX idx_billing_plan_prices_checkout
  ON public.billing_plan_prices (is_checkout_eligible, is_active)
  WHERE is_checkout_eligible = true AND is_active = true;

CREATE TRIGGER trg_billing_plan_prices_updated_at
  BEFORE UPDATE ON public.billing_plan_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART C: Webhook Event Storage
-- ============================================================

CREATE TABLE public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  polar_event_id text NOT NULL,
  event_type text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  organization_id text NULL,
  resource_id text NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz NULL,
  processing_worker_id text NULL,
  processed_at timestamptz NULL,
  ignored_at timestamptz NULL,
  last_error_code text NULL,
  last_error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_webhook_events_polar_event_unique UNIQUE (polar_event_id),
  CONSTRAINT billing_webhook_events_payload_is_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT billing_webhook_events_payload_hash_format CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT billing_webhook_events_attempt_non_negative CHECK (attempt_count >= 0),
  CONSTRAINT billing_webhook_events_status_check CHECK (
    status IN ('pending', 'processing', 'processed', 'ignored', 'failed')
  ),
  CONSTRAINT billing_webhook_events_processed_requires_timestamp CHECK (
    status <> 'processed' OR processed_at IS NOT NULL
  ),
  CONSTRAINT billing_webhook_events_ignored_requires_timestamp CHECK (
    status <> 'ignored' OR ignored_at IS NOT NULL
  ),
  CONSTRAINT billing_webhook_events_error_code_len CHECK (
    last_error_code IS NULL OR char_length(last_error_code) <= 120
  ),
  CONSTRAINT billing_webhook_events_error_message_len CHECK (
    last_error_message IS NULL OR char_length(last_error_message) <= 1000
  )
);

CREATE INDEX idx_billing_webhook_events_status_next_attempt
  ON public.billing_webhook_events (status, next_attempt_at, created_at);

CREATE INDEX idx_billing_webhook_events_type
  ON public.billing_webhook_events (event_type, created_at DESC);

CREATE INDEX idx_billing_webhook_events_resource
  ON public.billing_webhook_events (resource_id, event_timestamp DESC)
  WHERE resource_id IS NOT NULL;

CREATE TRIGGER trg_billing_webhook_events_updated_at
  BEFORE UPDATE ON public.billing_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART D: Optional Sync Run Diagnostics
-- ============================================================

CREATE TABLE public.billing_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL,
  sync_source text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  requested_by text NULL,
  worker_id text NULL,
  products_seen integer NOT NULL DEFAULT 0,
  products_synced integer NOT NULL DEFAULT 0,
  products_unmapped integer NOT NULL DEFAULT 0,
  products_conflict integer NOT NULL DEFAULT 0,
  products_failed integer NOT NULL DEFAULT 0,
  prices_created integer NOT NULL DEFAULT 0,
  prices_updated integer NOT NULL DEFAULT 0,
  prices_archived integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_sync_runs_run_type_check CHECK (
    run_type IN ('product_sync', 'reconciliation', 'initial_import')
  ),
  CONSTRAINT billing_sync_runs_source_check CHECK (
    sync_source IN ('webhook', 'manual', 'scheduled_reconciliation', 'initial_import')
  ),
  CONSTRAINT billing_sync_runs_status_check CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  CONSTRAINT billing_sync_runs_details_object CHECK (jsonb_typeof(details) = 'object'),
  CONSTRAINT billing_sync_runs_counts_non_negative CHECK (
    products_seen >= 0
    AND products_synced >= 0
    AND products_unmapped >= 0
    AND products_conflict >= 0
    AND products_failed >= 0
    AND prices_created >= 0
    AND prices_updated >= 0
    AND prices_archived >= 0
  )
);

CREATE INDEX idx_billing_sync_runs_started_at
  ON public.billing_sync_runs (started_at DESC);

CREATE INDEX idx_billing_sync_runs_status
  ON public.billing_sync_runs (status, started_at DESC);

CREATE TRIGGER trg_billing_sync_runs_updated_at
  BEFORE UPDATE ON public.billing_sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART E: RLS and Grants
-- ============================================================

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_sync_runs ENABLE ROW LEVEL SECURITY;

-- Platform admins may view plans/prices and webhook diagnostics.
CREATE POLICY billing_plans_platform_admin_select
  ON public.billing_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  );

CREATE POLICY billing_plans_platform_admin_write
  ON public.billing_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  );

CREATE POLICY billing_plan_prices_platform_admin_select
  ON public.billing_plan_prices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  );

CREATE POLICY billing_plan_prices_platform_admin_write
  ON public.billing_plan_prices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  );

CREATE POLICY billing_webhook_events_platform_admin_select
  ON public.billing_webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  );

CREATE POLICY billing_sync_runs_platform_admin_select
  ON public.billing_sync_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
        AND pa.is_active = true
    )
  );

-- No direct client mutation for webhook events or sync runs.
REVOKE ALL ON TABLE public.billing_webhook_events FROM anon;
REVOKE ALL ON TABLE public.billing_webhook_events FROM authenticated;
REVOKE ALL ON TABLE public.billing_sync_runs FROM anon;
REVOKE ALL ON TABLE public.billing_sync_runs FROM authenticated;

-- ============================================================
-- PART F: Claim Billing Webhook Events RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_billing_webhook_events(
  p_worker_id text,
  p_batch_size integer DEFAULT 10
)
RETURNS SETOF public.billing_webhook_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_batch_size integer := COALESCE(p_batch_size, 10);
BEGIN
  IF v_batch_size < 1 THEN
    v_batch_size := 1;
  END IF;

  IF v_batch_size > 50 THEN
    v_batch_size := 50;
  END IF;

  -- Recover stale processing locks (> 10 minutes), unless terminal.
  UPDATE public.billing_webhook_events
  SET
    status = 'pending',
    processing_started_at = NULL,
    processing_worker_id = NULL,
    next_attempt_at = now(),
    updated_at = now()
  WHERE status = 'processing'
    AND processing_started_at < now() - interval '10 minutes';

  RETURN QUERY
  UPDATE public.billing_webhook_events bwe
  SET
    status = 'processing',
    attempt_count = bwe.attempt_count + 1,
    processing_started_at = now(),
    processing_worker_id = left(COALESCE(p_worker_id, 'unknown-worker'), 120),
    updated_at = now()
  WHERE bwe.id IN (
    SELECT bwe2.id
    FROM public.billing_webhook_events bwe2
    WHERE bwe2.status = 'pending'
      AND bwe2.next_attempt_at <= now()
    ORDER BY bwe2.event_timestamp ASC, bwe2.created_at ASC
    FOR UPDATE OF bwe2 SKIP LOCKED
    LIMIT v_batch_size
  )
  RETURNING bwe.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_billing_webhook_events(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_billing_webhook_events(text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_billing_webhook_events(text, integer) TO authenticated;

COMMENT ON FUNCTION public.claim_billing_webhook_events(text, integer) IS
  'Claims pending billing webhook events using SKIP LOCKED. Recovers stale locks and increments attempt_count atomically.';
