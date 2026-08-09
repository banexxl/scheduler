-- Milestone 11.6 — Package Purchases through Polar
-- ==================================================

-- ─── Package Pricing (add to existing service_packages) ──────────────────────

ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS price_amount BIGINT NULL,
  ADD COLUMN IF NOT EXISTS price_currency TEXT NULL;

ALTER TABLE public.service_packages
  ADD CONSTRAINT sp_price_positive CHECK (price_amount IS NULL OR price_amount > 0),
  ADD CONSTRAINT sp_currency_format_price CHECK (price_currency IS NULL OR price_currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT sp_price_requires_currency CHECK (
    (price_amount IS NULL AND price_currency IS NULL) OR
    (price_amount IS NOT NULL AND price_currency IS NOT NULL)
  );

COMMENT ON COLUMN public.service_packages.price_amount IS 'Purchasable price in minor units. NULL = not purchasable online.';
COMMENT ON COLUMN public.service_packages.price_currency IS 'ISO 4217 currency for price_amount.';

-- ─── Package Purchases Table ─────────────────────────────────────────────────

CREATE TABLE public.package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  tenant_customer_id UUID NOT NULL REFERENCES public.tenant_customers(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'creating',

  package_name_snapshot TEXT NOT NULL,
  credits_snapshot INTEGER NOT NULL,
  validity_days_snapshot INTEGER NULL,

  amount_total BIGINT NOT NULL,
  currency TEXT NOT NULL,

  provider TEXT NULL,

  provider_checkout_id TEXT NULL,
  provider_order_id TEXT NULL,

  checkout_url TEXT NULL,

  request_key TEXT NOT NULL,

  paid_at TIMESTAMPTZ NULL,
  fulfilled_at TIMESTAMPTZ NULL,

  customer_package_id UUID NULL REFERENCES public.customer_packages(id) ON DELETE SET NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.package_purchases IS
  'Online package purchase records. Provider-neutral. Milestone 11.6.';

-- Constraints
ALTER TABLE public.package_purchases
  ADD CONSTRAINT pp_status_check CHECK (
    status IN ('creating', 'pending', 'paid', 'fulfilled', 'failed', 'expired', 'refunded', 'cancelled', 'requires_review')
  ),
  ADD CONSTRAINT pp_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT pp_amount_positive CHECK (amount_total > 0),
  ADD CONSTRAINT pp_credits_positive CHECK (credits_snapshot > 0),
  ADD CONSTRAINT pp_unique_request_key UNIQUE (tenant_id, request_key),
  ADD CONSTRAINT pp_fulfilled_requires_customer_package CHECK (
    status != 'fulfilled' OR customer_package_id IS NOT NULL
  ),
  ADD CONSTRAINT pp_paid_requires_paid_at CHECK (
    status NOT IN ('paid', 'fulfilled') OR paid_at IS NOT NULL
  ),
  ADD CONSTRAINT pp_metadata_is_object CHECK (jsonb_typeof(metadata) = 'object');

-- Indexes
CREATE INDEX idx_pp_tenant_created ON public.package_purchases (tenant_id, created_at DESC);
CREATE INDEX idx_pp_tenant_customer ON public.package_purchases (tenant_id, tenant_customer_id, created_at DESC);
CREATE INDEX idx_pp_tenant_package ON public.package_purchases (tenant_id, package_id, created_at DESC);
CREATE INDEX idx_pp_status ON public.package_purchases (status, created_at);

CREATE UNIQUE INDEX idx_pp_provider_checkout
  ON public.package_purchases (provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX idx_pp_provider_order
  ON public.package_purchases (provider_order_id)
  WHERE provider_order_id IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER trg_pp_updated_at
  BEFORE UPDATE ON public.package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Relationship verification
CREATE OR REPLACE FUNCTION public.verify_package_purchase_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify package belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.service_packages
    WHERE id = NEW.package_id AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Package does not belong to this tenant';
  END IF;

  -- Verify customer belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_customers
    WHERE id = NEW.tenant_customer_id AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to this tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_package_purchase
  BEFORE INSERT OR UPDATE ON public.package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.verify_package_purchase_relationships();

-- RLS
ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select_member"
  ON public.package_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = package_purchases.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct client writes

-- ─── Fulfill Package Purchase RPC ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fulfill_package_purchase(
  p_purchase_id UUID,
  p_provider_order_id TEXT DEFAULT NULL,
  p_paid_amount BIGINT DEFAULT NULL,
  p_paid_currency TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_customer_package_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Lock purchase
  SELECT * INTO v_purchase
  FROM package_purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF v_purchase IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Already fulfilled — idempotent
  IF v_purchase.status = 'fulfilled' THEN
    RETURN jsonb_build_object('status', 'already_fulfilled', 'customer_package_id', v_purchase.customer_package_id::TEXT);
  END IF;

  -- Must be paid or creating→paid transition
  IF v_purchase.status NOT IN ('paid', 'creating', 'pending') THEN
    RETURN jsonb_build_object('status', 'invalid_state', 'current_status', v_purchase.status);
  END IF;

  -- Verify amount if provided
  IF p_paid_amount IS NOT NULL AND p_paid_amount != v_purchase.amount_total THEN
    -- Mark requires review
    UPDATE package_purchases
    SET status = 'requires_review',
        provider_order_id = COALESCE(p_provider_order_id, provider_order_id)
    WHERE id = p_purchase_id;
    RETURN jsonb_build_object('status', 'amount_mismatch', 'expected', v_purchase.amount_total, 'received', p_paid_amount);
  END IF;

  -- Verify currency if provided
  IF p_paid_currency IS NOT NULL AND upper(p_paid_currency) != v_purchase.currency THEN
    UPDATE package_purchases
    SET status = 'requires_review',
        provider_order_id = COALESCE(p_provider_order_id, provider_order_id)
    WHERE id = p_purchase_id;
    RETURN jsonb_build_object('status', 'currency_mismatch');
  END IF;

  -- Calculate expiry
  IF v_purchase.validity_days_snapshot IS NOT NULL THEN
    v_expires_at := NOW() + (v_purchase.validity_days_snapshot || ' days')::INTERVAL;
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Create customer package
  INSERT INTO customer_packages (
    tenant_id, package_id, customer_id,
    credits_total, credits_remaining,
    starts_at, expires_at,
    status, source
  ) VALUES (
    v_purchase.tenant_id, v_purchase.package_id, v_purchase.tenant_customer_id,
    v_purchase.credits_snapshot, v_purchase.credits_snapshot,
    NOW(), v_expires_at,
    'active', 'payment'
  )
  RETURNING id INTO v_customer_package_id;

  -- Mark purchase fulfilled
  UPDATE package_purchases
  SET status = 'fulfilled',
      paid_at = COALESCE(paid_at, NOW()),
      fulfilled_at = NOW(),
      customer_package_id = v_customer_package_id,
      provider_order_id = COALESCE(p_provider_order_id, provider_order_id)
  WHERE id = p_purchase_id;

  RETURN jsonb_build_object(
    'status', 'fulfilled',
    'customer_package_id', v_customer_package_id::TEXT,
    'credits', v_purchase.credits_snapshot
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fulfill_package_purchase TO authenticated;
