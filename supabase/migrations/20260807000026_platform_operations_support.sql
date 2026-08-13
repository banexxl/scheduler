-- Migration: Platform Operations, Tenant Support & Admin Tooling (Milestone 15.11)
-- ====================================================================
-- Creates:
-- 1. platform_processor_runs (generic processor health tracking)
-- 2. platform_support_sessions (explicit time-bounded support access)
-- 3. platform_tenant_feature_overrides (kill switches)

-- ============================================================
-- PART A: Platform Processor Runs
-- ============================================================

CREATE TABLE public.platform_processor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_name TEXT NOT NULL,
  tenant_id UUID NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  duration_ms INTEGER NULL,
  claimed_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_code TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_processor_runs IS
  'Generic processor run history for operational health monitoring. Milestone 15.11.';

ALTER TABLE public.platform_processor_runs
  ADD CONSTRAINT ppr_status_check CHECK (status IN ('running', 'completed', 'failed')),
  ADD CONSTRAINT ppr_processor_name_length CHECK (char_length(processor_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT ppr_counts_non_negative CHECK (claimed_count >= 0 AND processed_count >= 0 AND failed_count >= 0),
  ADD CONSTRAINT ppr_metadata_object CHECK (jsonb_typeof(metadata) = 'object');

CREATE INDEX idx_ppr_processor_started ON public.platform_processor_runs (processor_name, started_at DESC);
CREATE INDEX idx_ppr_status ON public.platform_processor_runs (status, started_at DESC);

ALTER TABLE public.platform_processor_runs ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role only

-- ============================================================
-- PART B: Platform Support Sessions
-- ============================================================

CREATE TABLE public.platform_support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  ended_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_support_sessions IS
  'Explicit time-bounded platform support sessions. No silent impersonation. Milestone 15.11.';

ALTER TABLE public.platform_support_sessions
  ADD CONSTRAINT pss_status_check CHECK (status IN ('active', 'ended', 'expired')),
  ADD CONSTRAINT pss_reason_length CHECK (char_length(trim(reason)) BETWEEN 5 AND 500),
  ADD CONSTRAINT pss_active_requires_future_expiry CHECK (
    status != 'active' OR expires_at > started_at
  );

CREATE INDEX idx_pss_platform_user ON public.platform_support_sessions (platform_user_id, status);
CREATE INDEX idx_pss_tenant ON public.platform_support_sessions (tenant_id, status);
CREATE INDEX idx_pss_active ON public.platform_support_sessions (status, expires_at)
  WHERE status = 'active';

ALTER TABLE public.platform_support_sessions ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role / platform admin only

-- ============================================================
-- PART C: Platform Tenant Feature Overrides
-- ============================================================

CREATE TABLE public.platform_tenant_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_tenant_feature_overrides IS
  'Platform emergency kill switches per tenant. Does not overwrite tenant preference. Milestone 15.11.';

ALTER TABLE public.platform_tenant_feature_overrides
  ADD CONSTRAINT ptfo_feature_check CHECK (
    feature IN (
      'public_booking', 'online_payments', 'gift_cards',
      'referrals', 'campaigns', 'automations', 'imports'
    )
  ),
  ADD CONSTRAINT ptfo_reason_length CHECK (char_length(trim(reason)) BETWEEN 5 AND 500);

CREATE UNIQUE INDEX idx_ptfo_tenant_feature ON public.platform_tenant_feature_overrides (tenant_id, feature);
CREATE INDEX idx_ptfo_tenant ON public.platform_tenant_feature_overrides (tenant_id);

CREATE TRIGGER trg_ptfo_updated_at
  BEFORE UPDATE ON public.platform_tenant_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.platform_tenant_feature_overrides ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role / platform admin only
