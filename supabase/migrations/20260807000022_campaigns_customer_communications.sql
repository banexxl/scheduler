-- Migration: Campaigns & Customer Communications (Milestone 15.7)
-- ====================================================================
-- Creates:
-- 1. evaluate_segment_count / evaluate_segment_customers RPCs (closes 15.6.1 gap)
-- 2. marketing_unsubscribe_tokens table
-- 3. customer_campaigns table
-- 4. customer_campaign_recipients table
-- 5. Campaign processor RPCs

-- ============================================================
-- PART A: Segment Evaluation RPCs (closes 15.6.1 gap)
-- ============================================================

-- Count customers matching a dynamic WHERE clause.
-- Called by the segment evaluation service with server-generated SQL only.
-- SECURITY DEFINER to bypass RLS; caller validates tenant access.
CREATE OR REPLACE FUNCTION evaluate_segment_count(
  p_tenant_id UUID,
  p_where_clause TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  EXECUTE format(
    'SELECT COUNT(*) FROM tenant_customers tc WHERE tc.tenant_id = %L AND (%s)',
    p_tenant_id,
    p_where_clause
  ) INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION evaluate_segment_count FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evaluate_segment_count TO service_role;

-- Return matching customer rows (id, name, email) for segment preview/detail.
CREATE OR REPLACE FUNCTION evaluate_segment_customers(
  p_tenant_id UUID,
  p_where_clause TEXT,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(id UUID, name TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT tc.id, tc.name, tc.email FROM tenant_customers tc WHERE tc.tenant_id = %L AND (%s) ORDER BY tc.name ASC LIMIT %s OFFSET %s',
    p_tenant_id,
    p_where_clause,
    p_limit,
    p_offset
  );
END;
$$;

REVOKE ALL ON FUNCTION evaluate_segment_customers FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evaluate_segment_customers TO service_role;

-- ============================================================
-- PART B: Marketing Unsubscribe Tokens
-- ============================================================

CREATE TABLE public.marketing_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.tenant_customers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'marketing_unsubscribe',
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 year'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_unsubscribe_tokens IS
  'Secure hashed tokens for marketing unsubscribe links. Milestone 15.7.';

ALTER TABLE public.marketing_unsubscribe_tokens
  ADD CONSTRAINT mut_purpose_check CHECK (purpose IN ('marketing_unsubscribe')),
  ADD CONSTRAINT mut_token_hash_length CHECK (char_length(token_hash) BETWEEN 40 AND 128),
  ADD CONSTRAINT mut_token_prefix_length CHECK (char_length(token_prefix) BETWEEN 6 AND 20);

CREATE UNIQUE INDEX idx_mut_token_hash ON public.marketing_unsubscribe_tokens (token_hash);
CREATE INDEX idx_mut_tenant_customer ON public.marketing_unsubscribe_tokens (tenant_id, customer_id);

ALTER TABLE public.marketing_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- No direct user access — managed via service role
CREATE POLICY "mut_service_role_only"
  ON public.marketing_unsubscribe_tokens FOR ALL
  USING (false);

-- ============================================================
-- PART C: Customer Campaigns
-- ============================================================

CREATE TABLE public.customer_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT NULL,
  content TEXT NULL,
  cta_text TEXT NULL,
  cta_url TEXT NULL,

  -- Audience
  segment_id UUID NULL REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  audience_source TEXT NOT NULL DEFAULT 'segment',
  audience_name_snapshot TEXT NULL,
  audience_rules_snapshot JSONB NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,

  -- Metrics (updated during/after processing)
  matched_count INTEGER NOT NULL DEFAULT 0,
  eligible_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,

  -- Branding snapshot (presentation-critical fields)
  branding_snapshot JSONB NULL,

  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_campaigns IS
  'Tenant marketing campaigns. One row per campaign. Milestone 15.7.';

-- Constraints
ALTER TABLE public.customer_campaigns
  ADD CONSTRAINT cc_channel_check CHECK (channel IN ('email')),
  ADD CONSTRAINT cc_status_check CHECK (
    status IN ('draft', 'scheduled', 'processing', 'completed', 'cancelled', 'failed')
  ),
  ADD CONSTRAINT cc_audience_source_check CHECK (
    audience_source IN ('segment', 'built_in_segment')
  ),
  ADD CONSTRAINT cc_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  ADD CONSTRAINT cc_subject_length CHECK (subject IS NULL OR char_length(subject) <= 500),
  ADD CONSTRAINT cc_content_length CHECK (content IS NULL OR char_length(content) <= 50000),
  ADD CONSTRAINT cc_cta_text_length CHECK (cta_text IS NULL OR char_length(cta_text) <= 100),
  ADD CONSTRAINT cc_cta_url_length CHECK (cta_url IS NULL OR char_length(cta_url) <= 2000),
  ADD CONSTRAINT cc_cta_url_protocol CHECK (
    cta_url IS NULL OR cta_url ~ '^https?://'
  ),
  ADD CONSTRAINT cc_counts_non_negative CHECK (
    matched_count >= 0 AND eligible_count >= 0 AND sent_count >= 0
    AND delivered_count >= 0 AND failed_count >= 0 AND skipped_count >= 0
  ),
  ADD CONSTRAINT cc_scheduled_requires_time CHECK (
    status != 'scheduled' OR scheduled_for IS NOT NULL
  ),
  ADD CONSTRAINT cc_completed_requires_started CHECK (
    status != 'completed' OR started_at IS NOT NULL
  );

-- Indexes
CREATE INDEX idx_cc_tenant_created ON public.customer_campaigns (tenant_id, created_at DESC);
CREATE INDEX idx_cc_tenant_status ON public.customer_campaigns (tenant_id, status);
CREATE INDEX idx_cc_scheduled ON public.customer_campaigns (status, scheduled_for)
  WHERE status = 'scheduled' AND scheduled_for IS NOT NULL;

-- Updated-at trigger
CREATE TRIGGER trg_cc_updated_at
  BEFORE UPDATE ON public.customer_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.customer_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_select_member"
  ON public.customer_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_campaigns.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "cc_insert_owner_admin"
  ON public.customer_campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_campaigns.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "cc_update_owner_admin"
  ON public.customer_campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_campaigns.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "cc_delete_owner_admin"
  ON public.customer_campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_campaigns.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART D: Customer Campaign Recipients
-- ============================================================

CREATE TABLE public.customer_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.customer_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NULL REFERENCES public.tenant_customers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient_email TEXT NULL,
  status TEXT NOT NULL DEFAULT 'eligible',
  skip_reason TEXT NULL,
  provider_message_id TEXT NULL,
  queued_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_campaign_recipients IS
  'Immutable campaign recipient snapshot and delivery tracking. Milestone 15.7.';

-- Constraints
ALTER TABLE public.customer_campaign_recipients
  ADD CONSTRAINT ccr_channel_check CHECK (channel IN ('email')),
  ADD CONSTRAINT ccr_status_check CHECK (
    status IN ('eligible', 'queued', 'sent', 'delivered', 'failed', 'skipped')
  ),
  ADD CONSTRAINT ccr_skip_reason_check CHECK (
    skip_reason IS NULL OR skip_reason IN (
      'marketing_opt_out', 'missing_email', 'invalid_email',
      'customer_blocked', 'late_unsubscribe', 'duplicate', 'provider_error'
    )
  ),
  ADD CONSTRAINT ccr_recipient_email_check CHECK (
    recipient_email IS NULL OR (
      char_length(recipient_email) BETWEEN 5 AND 320
      AND recipient_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  ),
  ADD CONSTRAINT ccr_error_code_length CHECK (error_code IS NULL OR char_length(error_code) <= 100);

-- Idempotency: prevent duplicate recipients per campaign
CREATE UNIQUE INDEX idx_ccr_campaign_customer_channel
  ON public.customer_campaign_recipients (campaign_id, customer_id, channel)
  WHERE customer_id IS NOT NULL;

-- Query indexes
CREATE INDEX idx_ccr_campaign_status ON public.customer_campaign_recipients (campaign_id, status);
CREATE INDEX idx_ccr_tenant_customer ON public.customer_campaign_recipients (tenant_id, customer_id);

-- Updated-at trigger
CREATE TRIGGER trg_ccr_updated_at
  BEFORE UPDATE ON public.customer_campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.customer_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccr_select_member"
  ON public.customer_campaign_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_campaign_recipients.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct INSERT/UPDATE/DELETE — managed via service role during campaign processing

-- ============================================================
-- PART E: Campaign Processor RPCs
-- ============================================================

-- Claim a scheduled campaign for processing (atomic, prevents double-claim).
CREATE OR REPLACE FUNCTION claim_scheduled_campaign(
  p_campaign_id UUID,
  p_worker_id TEXT DEFAULT 'campaign_worker'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed BOOLEAN := false;
BEGIN
  UPDATE customer_campaigns
  SET status = 'processing',
      started_at = NOW(),
      updated_at = NOW()
  WHERE id = p_campaign_id
    AND status = 'scheduled'
    AND scheduled_for <= NOW();

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_scheduled_campaign FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_scheduled_campaign TO service_role;

-- Atomically start a send-now campaign (draft → processing).
CREATE OR REPLACE FUNCTION start_campaign_now(
  p_campaign_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started BOOLEAN := false;
BEGIN
  UPDATE customer_campaigns
  SET status = 'processing',
      started_at = NOW(),
      updated_at = NOW()
  WHERE id = p_campaign_id
    AND tenant_id = p_tenant_id
    AND status = 'draft';

  GET DIAGNOSTICS v_started = ROW_COUNT;
  RETURN v_started;
END;
$$;

REVOKE ALL ON FUNCTION start_campaign_now FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_campaign_now TO service_role;

-- Complete campaign processing with final metrics.
CREATE OR REPLACE FUNCTION complete_campaign(
  p_campaign_id UUID,
  p_sent_count INTEGER,
  p_failed_count INTEGER,
  p_skipped_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_campaigns
  SET status = 'completed',
      completed_at = NOW(),
      sent_count = p_sent_count,
      failed_count = p_failed_count,
      skipped_count = p_skipped_count,
      updated_at = NOW()
  WHERE id = p_campaign_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION complete_campaign FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_campaign TO service_role;

-- Mark campaign as failed.
CREATE OR REPLACE FUNCTION fail_campaign(
  p_campaign_id UUID,
  p_sent_count INTEGER DEFAULT 0,
  p_failed_count INTEGER DEFAULT 0,
  p_skipped_count INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_campaigns
  SET status = 'failed',
      sent_count = p_sent_count,
      failed_count = p_failed_count,
      skipped_count = p_skipped_count,
      updated_at = NOW()
  WHERE id = p_campaign_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION fail_campaign FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fail_campaign TO service_role;
