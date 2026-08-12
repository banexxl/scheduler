-- Migration: Tenant Referral Program — Milestone 15.3 Part B

-- ============================================================
-- 1. Tenant Referral Program Settings
-- ============================================================

CREATE TABLE public.tenant_referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  enabled BOOLEAN NOT NULL DEFAULT false,

  -- Referrer reward
  referrer_reward_type TEXT NOT NULL DEFAULT 'loyalty_points',
  referrer_reward_value INTEGER NOT NULL DEFAULT 0,

  -- Referred customer incentive (optional)
  referred_incentive_type TEXT NULL,
  referred_incentive_value INTEGER NULL,

  -- Qualification
  qualification_rule TEXT NOT NULL DEFAULT 'first_completed_appointment',

  -- Attribution window
  attribution_window_days INTEGER NOT NULL DEFAULT 30,

  -- Currency (for monetary rewards/incentives)
  currency TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trp_tenant_unique UNIQUE (tenant_id),
  CONSTRAINT trp_reward_type_check CHECK (
    referrer_reward_type IN ('loyalty_points', 'fixed_discount', 'percentage_discount')
  ),
  CONSTRAINT trp_incentive_type_check CHECK (
    referred_incentive_type IS NULL OR referred_incentive_type IN ('fixed_discount', 'percentage_discount')
  ),
  CONSTRAINT trp_reward_value_positive CHECK (referrer_reward_value >= 0),
  CONSTRAINT trp_incentive_value_positive CHECK (referred_incentive_value IS NULL OR referred_incentive_value > 0),
  CONSTRAINT trp_qualification_check CHECK (
    qualification_rule IN ('first_completed_appointment')
  ),
  CONSTRAINT trp_attribution_window CHECK (attribution_window_days BETWEEN 1 AND 365)
);

CREATE TRIGGER trg_trp_updated_at
  BEFORE UPDATE ON public.tenant_referral_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. Referral Codes
-- ============================================================

CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  customer_id UUID NOT NULL, -- tenant customer who owns this code
  code TEXT NOT NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT rc_code_unique UNIQUE (code), -- globally unique for simple link resolution
  CONSTRAINT rc_tenant_customer_unique UNIQUE (tenant_id, customer_id),
  CONSTRAINT rc_code_format CHECK (char_length(code) BETWEEN 4 AND 20)
);

CREATE INDEX idx_rc_code ON public.referral_codes (code);
CREATE INDEX idx_rc_tenant ON public.referral_codes (tenant_id, is_active);

-- ============================================================
-- 3. Customer Referrals (attribution + lifecycle)
-- ============================================================

CREATE TABLE public.customer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referrer_customer_id UUID NOT NULL,

  -- Referred customer (may be null initially for guest booking)
  referred_customer_id UUID NULL,
  referred_customer_email TEXT NULL,

  -- Qualifying appointment
  qualifying_appointment_id UUID NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'attributed',

  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_at TIMESTAMPTZ NULL,
  rewarded_at TIMESTAMPTZ NULL,
  disqualified_at TIMESTAMPTZ NULL,

  disqualification_reason TEXT NULL,

  -- Reward reference
  reward_reference_key TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cr_status_check CHECK (
    status IN ('attributed', 'booked', 'qualified', 'rewarded', 'disqualified', 'cancelled')
  ),
  CONSTRAINT cr_qualified_requires_timestamp CHECK (
    status NOT IN ('qualified', 'rewarded') OR qualified_at IS NOT NULL
  ),
  CONSTRAINT cr_rewarded_requires_timestamp CHECK (
    status != 'rewarded' OR rewarded_at IS NOT NULL
  ),
  -- One acquisition per referred customer per tenant
  CONSTRAINT cr_unique_acquisition UNIQUE (tenant_id, referred_customer_email)
);

CREATE INDEX idx_cr_tenant ON public.customer_referrals (tenant_id, status, attributed_at DESC);
CREATE INDEX idx_cr_referrer ON public.customer_referrals (tenant_id, referrer_customer_id);
CREATE INDEX idx_cr_referred ON public.customer_referrals (tenant_id, referred_customer_id) WHERE referred_customer_id IS NOT NULL;
CREATE INDEX idx_cr_appointment ON public.customer_referrals (qualifying_appointment_id) WHERE qualifying_appointment_id IS NOT NULL;

CREATE TRIGGER trg_cr_updated_at
  BEFORE UPDATE ON public.customer_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE public.tenant_referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;

-- Programs: member read, owner/admin write
CREATE POLICY "trp_select_member" ON public.tenant_referral_programs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_referral_programs.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "trp_upsert_owner_admin" ON public.tenant_referral_programs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_referral_programs.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "trp_update_owner_admin" ON public.tenant_referral_programs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_referral_programs.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

-- Codes: member read
CREATE POLICY "rc_select_member" ON public.referral_codes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = referral_codes.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

-- Referrals: member read
CREATE POLICY "cr_select_member" ON public.customer_referrals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_referrals.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));
