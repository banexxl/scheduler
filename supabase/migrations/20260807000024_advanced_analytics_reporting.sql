-- Migration: Advanced Analytics, Reporting & Exports (Milestone 15.9)
-- ====================================================================
-- Creates:
-- 1. saved_analytics_reports table
-- 2. get_customer_retention_analytics RPC
-- 3. get_marketing_analytics_summary RPC
-- 4. get_package_analytics RPC
-- 5. get_gift_card_analytics RPC

-- ============================================================
-- PART A: Saved Analytics Reports
-- ============================================================

CREATE TABLE public.saved_analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.saved_analytics_reports IS
  'Saved analytics report configurations. Stores filters, not results. Milestone 15.9.';

ALTER TABLE public.saved_analytics_reports
  ADD CONSTRAINT sar_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  ADD CONSTRAINT sar_report_type_check CHECK (
    report_type IN ('overview', 'appointments', 'customers', 'services', 'staff', 'locations', 'finance', 'marketing')
  ),
  ADD CONSTRAINT sar_filters_object CHECK (jsonb_typeof(filters) = 'object');

CREATE INDEX idx_sar_tenant_created ON public.saved_analytics_reports (tenant_id, created_at DESC);

CREATE TRIGGER trg_sar_updated_at
  BEFORE UPDATE ON public.saved_analytics_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.saved_analytics_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sar_select_member"
  ON public.saved_analytics_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = saved_analytics_reports.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "sar_insert_owner_admin_manager"
  ON public.saved_analytics_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = saved_analytics_reports.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "sar_update_owner_admin_manager"
  ON public.saved_analytics_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = saved_analytics_reports.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "sar_delete_owner_admin_manager"
  ON public.saved_analytics_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = saved_analytics_reports.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

-- ============================================================
-- PART B: Customer Retention Analytics RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_customer_retention_analytics(
  p_tenant_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_customers INT;
  v_new_customers INT;
  v_returning_customers INT;
  v_with_upcoming INT;
  v_inactive INT;
  v_avg_visits NUMERIC;
  v_repeat_rate NUMERIC;
  v_customers_with_one INT;
  v_customers_with_two INT;
BEGIN
  -- Total tenant customers
  SELECT COUNT(*) INTO v_total_customers
  FROM tenant_customers
  WHERE tenant_id = p_tenant_id;

  -- New customers (first appointment in this period)
  SELECT COUNT(DISTINCT customer_id) INTO v_new_customers
  FROM appointments
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND customer_id IS NOT NULL
    AND completed_at >= p_range_start
    AND completed_at < p_range_end
    AND NOT EXISTS (
      SELECT 1 FROM appointments prior
      WHERE prior.tenant_id = p_tenant_id
        AND prior.customer_id = appointments.customer_id
        AND prior.status = 'completed'
        AND prior.completed_at < p_range_start
    );

  -- Returning customers (had prior completed appointment before this period)
  SELECT COUNT(DISTINCT customer_id) INTO v_returning_customers
  FROM appointments
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND customer_id IS NOT NULL
    AND completed_at >= p_range_start
    AND completed_at < p_range_end
    AND EXISTS (
      SELECT 1 FROM appointments prior
      WHERE prior.tenant_id = p_tenant_id
        AND prior.customer_id = appointments.customer_id
        AND prior.status = 'completed'
        AND prior.completed_at < p_range_start
    );

  -- With upcoming
  SELECT COUNT(*) INTO v_with_upcoming
  FROM tenant_customers tc
  WHERE tc.tenant_id = p_tenant_id
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.tenant_id = p_tenant_id
        AND a.customer_id = tc.id
        AND a.status IN ('confirmed', 'pending')
        AND a.starts_at > NOW()
    );

  -- Inactive (no completed in 90 days and no upcoming)
  SELECT COUNT(*) INTO v_inactive
  FROM tenant_customers tc
  WHERE tc.tenant_id = p_tenant_id
    AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.tenant_id = p_tenant_id
        AND a.customer_id = tc.id
        AND a.status = 'completed'
        AND a.completed_at > (NOW() - INTERVAL '90 days')
    )
    AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.tenant_id = p_tenant_id
        AND a.customer_id = tc.id
        AND a.status IN ('confirmed', 'pending')
        AND a.starts_at > NOW()
    );

  -- Average visits per customer (completed appointments)
  SELECT COALESCE(AVG(visit_count), 0) INTO v_avg_visits
  FROM (
    SELECT COUNT(*) AS visit_count
    FROM appointments
    WHERE tenant_id = p_tenant_id
      AND status = 'completed'
      AND customer_id IS NOT NULL
    GROUP BY customer_id
  ) sub;

  -- Repeat customer rate: customers with >=2 / customers with >=1
  SELECT COUNT(*) INTO v_customers_with_one
  FROM (
    SELECT customer_id
    FROM appointments
    WHERE tenant_id = p_tenant_id AND status = 'completed' AND customer_id IS NOT NULL
    GROUP BY customer_id
    HAVING COUNT(*) >= 1
  ) sub;

  SELECT COUNT(*) INTO v_customers_with_two
  FROM (
    SELECT customer_id
    FROM appointments
    WHERE tenant_id = p_tenant_id AND status = 'completed' AND customer_id IS NOT NULL
    GROUP BY customer_id
    HAVING COUNT(*) >= 2
  ) sub;

  v_repeat_rate := CASE WHEN v_customers_with_one > 0
    THEN v_customers_with_two::NUMERIC / v_customers_with_one
    ELSE NULL END;

  RETURN jsonb_build_object(
    'total_customers', v_total_customers,
    'new_customers', v_new_customers,
    'returning_customers', v_returning_customers,
    'with_upcoming', v_with_upcoming,
    'inactive', v_inactive,
    'avg_visits', ROUND(v_avg_visits, 2),
    'repeat_rate', ROUND(COALESCE(v_repeat_rate, 0), 4)
  );
END;
$$;

REVOKE ALL ON FUNCTION get_customer_retention_analytics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_customer_retention_analytics TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_retention_analytics TO authenticated;

-- ============================================================
-- PART C: Marketing Analytics Summary RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_marketing_analytics_summary(
  p_tenant_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaigns JSONB;
  v_automations JSONB;
  v_referrals JSONB;
BEGIN
  -- Campaign metrics
  SELECT jsonb_build_object(
    'total_sent', COUNT(*) FILTER (WHERE status IN ('completed', 'failed')),
    'total_recipients', COALESCE(SUM(eligible_count), 0)::INT,
    'total_delivered', COALESCE(SUM(sent_count), 0)::INT,
    'total_failed', COALESCE(SUM(failed_count), 0)::INT,
    'total_skipped', COALESCE(SUM(skipped_count), 0)::INT
  ) INTO v_campaigns
  FROM customer_campaigns
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_range_start
    AND created_at < p_range_end;

  -- Automation metrics
  SELECT jsonb_build_object(
    'active_automations', (SELECT COUNT(*) FROM marketing_automations WHERE tenant_id = p_tenant_id AND status = 'active'),
    'total_enrollments', COUNT(*),
    'completed_journeys', COUNT(*) FILTER (WHERE status = 'completed'),
    'failed_journeys', COUNT(*) FILTER (WHERE status = 'failed'),
    'emails_sent', 0,
    'emails_skipped', 0
  ) INTO v_automations
  FROM marketing_automation_enrollments
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_range_start
    AND created_at < p_range_end;

  -- Referral metrics
  SELECT jsonb_build_object(
    'total_attributed', COUNT(*) FILTER (WHERE status IN ('attributed', 'qualified', 'rewarded')),
    'total_qualified', COUNT(*) FILTER (WHERE status IN ('qualified', 'rewarded')),
    'qualification_rate', CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('attributed', 'qualified', 'rewarded')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status IN ('qualified', 'rewarded'))::NUMERIC /
        COUNT(*) FILTER (WHERE status IN ('attributed', 'qualified', 'rewarded')),
        4
      )
      ELSE NULL
    END
  ) INTO v_referrals
  FROM customer_referrals
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_range_start
    AND created_at < p_range_end;

  RETURN jsonb_build_object(
    'campaigns', v_campaigns,
    'automations', v_automations,
    'referrals', v_referrals
  );
END;
$$;

REVOKE ALL ON FUNCTION get_marketing_analytics_summary FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_marketing_analytics_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_marketing_analytics_summary TO authenticated;

-- ============================================================
-- PART D: Package Analytics RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_package_analytics(
  p_tenant_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sold INT;
  v_active INT;
  v_expired INT;
  v_credits_issued BIGINT;
  v_credits_consumed BIGINT;
  v_credits_remaining BIGINT;
BEGIN
  -- Packages sold in period
  SELECT COUNT(*) INTO v_sold
  FROM customer_packages
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_range_start
    AND created_at < p_range_end;

  -- Current active
  SELECT COUNT(*) INTO v_active
  FROM customer_packages
  WHERE tenant_id = p_tenant_id AND status = 'active';

  -- Expired
  SELECT COUNT(*) INTO v_expired
  FROM customer_packages
  WHERE tenant_id = p_tenant_id AND status = 'expired';

  -- Credits
  SELECT
    COALESCE(SUM(credits_total), 0),
    COALESCE(SUM(credits_total - credits_remaining), 0),
    COALESCE(SUM(credits_remaining), 0)
  INTO v_credits_issued, v_credits_consumed, v_credits_remaining
  FROM customer_packages
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'sold', v_sold,
    'active', v_active,
    'expired', v_expired,
    'credits_issued', v_credits_issued,
    'credits_consumed', v_credits_consumed,
    'credits_remaining', v_credits_remaining
  );
END;
$$;

REVOKE ALL ON FUNCTION get_package_analytics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_package_analytics TO service_role;
GRANT EXECUTE ON FUNCTION get_package_analytics TO authenticated;

-- ============================================================
-- PART E: Gift Card Analytics RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_gift_card_analytics(
  p_tenant_id UUID,
  p_range_start TIMESTAMPTZ,
  p_range_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sold INT;
  v_issued JSONB;
  v_redeemed JSONB;
  v_outstanding JSONB;
BEGIN
  -- Cards sold/issued in period
  SELECT COUNT(*) INTO v_sold
  FROM gift_cards
  WHERE tenant_id = p_tenant_id
    AND created_at >= p_range_start
    AND created_at < p_range_end;

  -- Value issued by currency (in period)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('currency', currency, 'amount', total)), '[]'::JSONB)
  INTO v_issued
  FROM (
    SELECT currency, SUM(original_balance)::BIGINT AS total
    FROM gift_cards
    WHERE tenant_id = p_tenant_id
      AND created_at >= p_range_start
      AND created_at < p_range_end
    GROUP BY currency
  ) sub;

  -- Value redeemed (all time, by currency) — approximation: original - current
  SELECT COALESCE(jsonb_agg(jsonb_build_object('currency', currency, 'amount', total)), '[]'::JSONB)
  INTO v_redeemed
  FROM (
    SELECT currency, SUM(original_balance - current_balance)::BIGINT AS total
    FROM gift_cards
    WHERE tenant_id = p_tenant_id
    GROUP BY currency
  ) sub;

  -- Outstanding balance by currency
  SELECT COALESCE(jsonb_agg(jsonb_build_object('currency', currency, 'amount', total)), '[]'::JSONB)
  INTO v_outstanding
  FROM (
    SELECT currency, SUM(current_balance)::BIGINT AS total
    FROM gift_cards
    WHERE tenant_id = p_tenant_id AND status = 'active'
    GROUP BY currency
  ) sub;

  RETURN jsonb_build_object(
    'sold', v_sold,
    'value_issued', v_issued,
    'value_redeemed', v_redeemed,
    'outstanding', v_outstanding
  );
END;
$$;

REVOKE ALL ON FUNCTION get_gift_card_analytics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_gift_card_analytics TO service_role;
GRANT EXECUTE ON FUNCTION get_gift_card_analytics TO authenticated;
