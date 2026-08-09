-- Milestone 11.7 — Tenant Polar Products, Discounts & Provider Resource Sync
-- ============================================================================

-- ─── Payment Provider Resources (General Mapping) ────────────────────────────

CREATE TABLE public.payment_provider_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  local_resource_id UUID NOT NULL,

  provider_resource_id TEXT NULL,

  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_version INTEGER NOT NULL DEFAULT 1,

  provider_version TEXT NULL,

  last_sync_attempt_at TIMESTAMPTZ NULL,
  last_synced_at TIMESTAMPTZ NULL,

  sync_error_code TEXT NULL,
  sync_error_message TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_provider_resources IS
  'Provider resource mapping. Local-first sync model. Milestone 11.7.';

ALTER TABLE public.payment_provider_resources
  ADD CONSTRAINT ppr_provider_check CHECK (provider IN ('polar')),
  ADD CONSTRAINT ppr_resource_type_check CHECK (resource_type IN ('product', 'discount')),
  ADD CONSTRAINT ppr_sync_status_check CHECK (
    sync_status IN ('pending', 'syncing', 'synced', 'failed', 'archived')
  ),
  ADD CONSTRAINT ppr_synced_requires_provider_id CHECK (
    sync_status != 'synced' OR provider_resource_id IS NOT NULL
  ),
  ADD CONSTRAINT ppr_unique_local UNIQUE (tenant_id, provider, resource_type, local_resource_id);

CREATE UNIQUE INDEX idx_ppr_provider_resource_id
  ON public.payment_provider_resources (provider, provider_resource_id)
  WHERE provider_resource_id IS NOT NULL;

CREATE INDEX idx_ppr_tenant_type ON public.payment_provider_resources (tenant_id, resource_type, sync_status);

CREATE TRIGGER trg_ppr_updated_at
  BEFORE UPDATE ON public.payment_provider_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_provider_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppr_select_member"
  ON public.payment_provider_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = payment_provider_resources.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Tenant Discounts ────────────────────────────────────────────────────────

CREATE TABLE public.tenant_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  code TEXT NULL,

  discount_type TEXT NOT NULL,

  percentage INTEGER NULL,
  fixed_amount BIGINT NULL,
  currency TEXT NULL,

  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,

  maximum_redemptions INTEGER NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_discounts IS
  'Tenant-managed discount/coupon definitions. Provider-synced. Milestone 11.7.';

ALTER TABLE public.tenant_discounts
  ADD CONSTRAINT td_discount_type_check CHECK (discount_type IN ('percentage', 'fixed')),
  ADD CONSTRAINT td_percentage_range CHECK (
    discount_type != 'percentage' OR (percentage BETWEEN 1 AND 99)
  ),
  ADD CONSTRAINT td_fixed_positive CHECK (
    discount_type != 'fixed' OR (fixed_amount > 0 AND currency IS NOT NULL)
  ),
  ADD CONSTRAINT td_currency_format CHECK (
    currency IS NULL OR currency ~ '^[A-Z]{3}$'
  ),
  ADD CONSTRAINT td_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT td_code_length CHECK (code IS NULL OR char_length(trim(code)) BETWEEN 2 AND 30),
  ADD CONSTRAINT td_max_redemptions_positive CHECK (maximum_redemptions IS NULL OR maximum_redemptions > 0),
  ADD CONSTRAINT td_ends_after_starts CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
  );

CREATE UNIQUE INDEX idx_td_tenant_code
  ON public.tenant_discounts (tenant_id, upper(trim(code)))
  WHERE code IS NOT NULL;

CREATE INDEX idx_td_tenant_active ON public.tenant_discounts (tenant_id, is_active);

CREATE TRIGGER trg_td_updated_at
  BEFORE UPDATE ON public.tenant_discounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tenant_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "td_select_member"
  ON public.tenant_discounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_discounts.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Tenant Discount Targets ─────────────────────────────────────────────────

CREATE TABLE public.tenant_discount_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES public.tenant_discounts(id) ON DELETE CASCADE,

  target_type TEXT NOT NULL,
  target_id UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_discount_targets IS
  'Discount applicability rules. Milestone 11.7.';

ALTER TABLE public.tenant_discount_targets
  ADD CONSTRAINT tdt_target_type_check CHECK (
    target_type IN ('all_appointments', 'all_packages', 'service', 'package')
  ),
  ADD CONSTRAINT tdt_specific_requires_id CHECK (
    target_type IN ('all_appointments', 'all_packages') OR target_id IS NOT NULL
  );

CREATE INDEX idx_tdt_discount ON public.tenant_discount_targets (discount_id);
CREATE INDEX idx_tdt_tenant_type ON public.tenant_discount_targets (tenant_id, target_type, target_id);

ALTER TABLE public.tenant_discount_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tdt_select_member"
  ON public.tenant_discount_targets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_discount_targets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Tenant Discount Redemptions ─────────────────────────────────────────────

CREATE TABLE public.tenant_discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  discount_id UUID NOT NULL REFERENCES public.tenant_discounts(id) ON DELETE CASCADE,

  appointment_payment_id UUID NULL REFERENCES public.appointment_payments(id) ON DELETE SET NULL,
  package_purchase_id UUID NULL REFERENCES public.package_purchases(id) ON DELETE SET NULL,

  customer_id UUID NULL,

  amount_discounted BIGINT NOT NULL,
  currency TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'reserved',

  provider_order_id TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ NULL
);

COMMENT ON TABLE public.tenant_discount_redemptions IS
  'Discount usage tracking. Reserved on checkout, confirmed on payment. Milestone 11.7.';

ALTER TABLE public.tenant_discount_redemptions
  ADD CONSTRAINT tdr_status_check CHECK (status IN ('reserved', 'confirmed', 'released')),
  ADD CONSTRAINT tdr_amount_positive CHECK (amount_discounted > 0),
  ADD CONSTRAINT tdr_currency_format CHECK (currency ~ '^[A-Z]{3}$');

CREATE INDEX idx_tdr_discount ON public.tenant_discount_redemptions (discount_id, status);
CREATE INDEX idx_tdr_tenant ON public.tenant_discount_redemptions (tenant_id, created_at DESC);

ALTER TABLE public.tenant_discount_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tdr_select_member"
  ON public.tenant_discount_redemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_discount_redemptions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );
