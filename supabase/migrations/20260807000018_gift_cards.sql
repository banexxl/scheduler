-- Migration: Gift Cards & Stored Value — Milestone 15.2

-- ============================================================
-- 1. Tenant Gift Card Settings
-- ============================================================

CREATE TABLE public.tenant_gift_card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  enabled BOOLEAN NOT NULL DEFAULT false,

  allow_custom_amount BOOLEAN NOT NULL DEFAULT false,
  minimum_custom_amount INTEGER NULL, -- minor units
  maximum_custom_amount INTEGER NULL, -- minor units

  expires_after_days INTEGER NULL, -- null = never expires

  allow_appointment_redemption BOOLEAN NOT NULL DEFAULT true,
  allow_package_redemption BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tgcs_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT tgcs_custom_amount_range CHECK (
    NOT allow_custom_amount OR (minimum_custom_amount IS NOT NULL AND maximum_custom_amount IS NOT NULL AND minimum_custom_amount > 0 AND maximum_custom_amount >= minimum_custom_amount)
  ),
  CONSTRAINT tgcs_expires_positive CHECK (expires_after_days IS NULL OR expires_after_days > 0)
);

CREATE TRIGGER trg_tgcs_updated_at
  BEFORE UPDATE ON public.tenant_gift_card_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Gift Card Products (predefined denominations)
-- ============================================================

CREATE TABLE public.gift_card_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT NULL,

  amount INTEGER NOT NULL, -- minor units
  currency TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gcp_amount_positive CHECK (amount > 0),
  CONSTRAINT gcp_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT gcp_name_len CHECK (char_length(name) BETWEEN 1 AND 200)
);

CREATE INDEX idx_gcp_tenant ON public.gift_card_products (tenant_id, is_active, sort_order);

CREATE TRIGGER trg_gcp_updated_at
  BEFORE UPDATE ON public.gift_card_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Gift Card Purchases
-- ============================================================

CREATE TABLE public.gift_card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  gift_card_product_id UUID NULL REFERENCES public.gift_card_products(id) ON DELETE SET NULL,

  amount INTEGER NOT NULL, -- minor units
  currency TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'creating',

  -- Buyer
  buyer_email TEXT NULL,
  buyer_name TEXT NULL,

  -- Recipient
  recipient_name TEXT NULL,
  recipient_email TEXT NULL,
  recipient_message TEXT NULL,
  is_gift BOOLEAN NOT NULL DEFAULT false,

  -- Provider
  polar_checkout_id TEXT NULL,
  polar_order_id TEXT NULL,
  provider_event_id TEXT NULL,

  -- Correlation
  request_key UUID NOT NULL,

  fulfilled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gcpu_amount_positive CHECK (amount > 0),
  CONSTRAINT gcpu_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT gcpu_status_check CHECK (
    status IN ('creating', 'pending', 'paid', 'fulfilled', 'failed', 'cancelled', 'refunded', 'requires_review')
  ),
  CONSTRAINT gcpu_request_key_unique UNIQUE (tenant_id, request_key)
);

CREATE INDEX idx_gcpu_tenant ON public.gift_card_purchases (tenant_id, created_at DESC);
CREATE INDEX idx_gcpu_polar_order ON public.gift_card_purchases (polar_order_id) WHERE polar_order_id IS NOT NULL;

CREATE TRIGGER trg_gcpu_updated_at
  BEFORE UPDATE ON public.gift_card_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Gift Cards
-- ============================================================

CREATE TABLE public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  purchase_id UUID NULL REFERENCES public.gift_card_purchases(id) ON DELETE SET NULL,

  code_hash TEXT NOT NULL,
  code_prefix TEXT NOT NULL,

  currency TEXT NOT NULL,
  initial_amount INTEGER NOT NULL, -- minor units
  current_balance INTEGER NOT NULL DEFAULT 0, -- cached, ledger authoritative

  status TEXT NOT NULL DEFAULT 'active',

  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NULL,

  claimed_by_customer_account_id UUID NULL,

  recipient_name TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gc_amount_positive CHECK (initial_amount > 0),
  CONSTRAINT gc_balance_non_negative CHECK (current_balance >= 0),
  CONSTRAINT gc_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT gc_status_check CHECK (status IN ('active', 'fully_redeemed', 'expired', 'disabled')),
  CONSTRAINT gc_code_hash_unique UNIQUE (code_hash),
  CONSTRAINT gc_code_prefix_len CHECK (char_length(code_prefix) BETWEEN 4 AND 12)
);

CREATE INDEX idx_gc_tenant ON public.gift_cards (tenant_id, status, issued_at DESC);
CREATE INDEX idx_gc_hash ON public.gift_cards (code_hash);
CREATE INDEX idx_gc_customer ON public.gift_cards (claimed_by_customer_account_id) WHERE claimed_by_customer_account_id IS NOT NULL;

CREATE TRIGGER trg_gc_updated_at
  BEFORE UPDATE ON public.gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Gift Card Ledger (append-only financial history)
-- ============================================================

CREATE TABLE public.gift_card_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,

  entry_type TEXT NOT NULL,
  amount INTEGER NOT NULL, -- positive = credit, negative = debit
  currency TEXT NOT NULL,

  -- References
  appointment_payment_id UUID NULL,
  package_purchase_id UUID NULL,
  gift_card_purchase_id UUID NULL REFERENCES public.gift_card_purchases(id) ON DELETE SET NULL,

  reference_key TEXT NULL,
  description TEXT NULL,

  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gcle_entry_type_check CHECK (
    entry_type IN ('issuance', 'redemption', 'redemption_reversal', 'refund_adjustment', 'manual_adjustment', 'expiry')
  ),
  CONSTRAINT gcle_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT gcle_reference_len CHECK (reference_key IS NULL OR char_length(reference_key) <= 200),
  CONSTRAINT gcle_description_len CHECK (description IS NULL OR char_length(description) <= 500)
);

CREATE INDEX idx_gcle_card ON public.gift_card_ledger_entries (gift_card_id, created_at DESC);
CREATE INDEX idx_gcle_tenant ON public.gift_card_ledger_entries (tenant_id, created_at DESC);
CREATE INDEX idx_gcle_reference ON public.gift_card_ledger_entries (reference_key) WHERE reference_key IS NOT NULL;

-- ============================================================
-- 6. Gift Card Reservations
-- ============================================================

CREATE TABLE public.gift_card_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,

  amount INTEGER NOT NULL, -- minor units reserved
  currency TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'reserved',

  -- What this reservation is for
  appointment_payment_id UUID NULL,
  package_purchase_id UUID NULL,

  expires_at TIMESTAMPTZ NULL,

  confirmed_at TIMESTAMPTZ NULL,
  released_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT gcr_amount_positive CHECK (amount > 0),
  CONSTRAINT gcr_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT gcr_status_check CHECK (status IN ('reserved', 'confirmed', 'released'))
);

CREATE INDEX idx_gcr_card ON public.gift_card_reservations (gift_card_id, status);
CREATE INDEX idx_gcr_tenant ON public.gift_card_reservations (tenant_id, status);

CREATE TRIGGER trg_gcr_updated_at
  BEFORE UPDATE ON public.gift_card_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 7. RLS
-- ============================================================

ALTER TABLE public.tenant_gift_card_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_reservations ENABLE ROW LEVEL SECURITY;

-- Settings: member read, owner/admin write
CREATE POLICY "tgcs_select_member" ON public.tenant_gift_card_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_gift_card_settings.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "tgcs_upsert_owner_admin" ON public.tenant_gift_card_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_gift_card_settings.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "tgcs_update_owner_admin" ON public.tenant_gift_card_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_gift_card_settings.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

-- Products: member read, owner/admin write
CREATE POLICY "gcp_select_member" ON public.gift_card_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_card_products.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "gcp_insert_owner_admin" ON public.gift_card_products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_card_products.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "gcp_update_owner_admin" ON public.gift_card_products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_card_products.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

-- Gift cards: member read (no direct public access)
CREATE POLICY "gc_select_member" ON public.gift_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_cards.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

-- Ledger: member read
CREATE POLICY "gcle_select_member" ON public.gift_card_ledger_entries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_card_ledger_entries.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

-- Reservations: member read
CREATE POLICY "gcr_select_member" ON public.gift_card_reservations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_card_reservations.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

-- Purchases: member read
CREATE POLICY "gcpu_select_member" ON public.gift_card_purchases FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = gift_card_purchases.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

-- ============================================================
-- 8. Fulfill Gift Card Purchase RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.fulfill_gift_card_purchase(
  p_purchase_id UUID,
  p_provider_order_id TEXT,
  p_provider_event_id TEXT,
  p_paid_amount INTEGER,
  p_paid_currency TEXT,
  p_code_hash TEXT,
  p_code_prefix TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase RECORD;
  v_card_id UUID;
BEGIN
  -- Lock purchase
  SELECT * INTO v_purchase
  FROM gift_card_purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF v_purchase IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Idempotency: already fulfilled
  IF v_purchase.status = 'fulfilled' THEN
    RETURN jsonb_build_object('status', 'already_fulfilled');
  END IF;

  -- Verify amounts
  IF v_purchase.amount != p_paid_amount OR v_purchase.currency != p_paid_currency THEN
    RETURN jsonb_build_object('status', 'amount_mismatch');
  END IF;

  -- Update purchase
  UPDATE gift_card_purchases
  SET status = 'fulfilled',
      polar_order_id = p_provider_order_id,
      provider_event_id = p_provider_event_id,
      fulfilled_at = now()
  WHERE id = p_purchase_id;

  -- Create gift card
  INSERT INTO gift_cards (
    tenant_id, purchase_id, code_hash, code_prefix,
    currency, initial_amount, current_balance, status,
    issued_at, expires_at, recipient_name
  )
  VALUES (
    v_purchase.tenant_id, p_purchase_id, p_code_hash, p_code_prefix,
    v_purchase.currency, v_purchase.amount, v_purchase.amount, 'active',
    now(), p_expires_at, v_purchase.recipient_name
  )
  RETURNING id INTO v_card_id;

  -- Append issuance ledger entry
  INSERT INTO gift_card_ledger_entries (
    tenant_id, gift_card_id, entry_type, amount, currency,
    gift_card_purchase_id, reference_key, description
  )
  VALUES (
    v_purchase.tenant_id, v_card_id, 'issuance', v_purchase.amount, v_purchase.currency,
    p_purchase_id, 'purchase:' || p_purchase_id::text, 'Gift card purchased'
  );

  RETURN jsonb_build_object('status', 'fulfilled', 'gift_card_id', v_card_id::text);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fulfill_gift_card_purchase(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
