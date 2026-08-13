-- Migration: Marketing Automations & Customer Journeys (Milestone 15.8)
-- ====================================================================
-- Creates:
-- 1. marketing_automations (logical automation identity)
-- 2. marketing_automation_versions (immutable published workflow definitions)
-- 3. marketing_automation_steps (steps within a version)
-- 4. marketing_automation_enrollments (customer journeys)
-- 5. marketing_automation_step_executions (step-level execution history)
-- 6. Processor RPCs (claim enrollments, complete steps)

-- ============================================================
-- PART A: Marketing Automations (logical identity)
-- ============================================================

CREATE TABLE public.marketing_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  entry_conditions JSONB NULL,
  re_enrollment_policy TEXT NOT NULL DEFAULT 'once_per_trigger',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'draft',
  current_version_id UUID NULL, -- Set after first publish
  published_at TIMESTAMPTZ NULL,
  paused_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_automations IS
  'Tenant marketing automation definitions. Logical identity. Milestone 15.8.';

ALTER TABLE public.marketing_automations
  ADD CONSTRAINT ma_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  ADD CONSTRAINT ma_trigger_type_check CHECK (
    trigger_type IN (
      'appointment_completed', 'referral_rewarded', 'gift_card_purchased',
      'customer_inactive', 'package_expiring', 'loyalty_threshold_reached'
    )
  ),
  ADD CONSTRAINT ma_status_check CHECK (
    status IN ('draft', 'active', 'paused', 'archived')
  ),
  ADD CONSTRAINT ma_re_enrollment_check CHECK (
    re_enrollment_policy IN ('once_ever', 'once_per_trigger', 'after_completion')
  ),
  ADD CONSTRAINT ma_trigger_config_object CHECK (jsonb_typeof(trigger_config) = 'object'),
  ADD CONSTRAINT ma_active_requires_published CHECK (
    status != 'active' OR (published_at IS NOT NULL AND current_version_id IS NOT NULL)
  );

CREATE INDEX idx_ma_tenant_status ON public.marketing_automations (tenant_id, status);
CREATE INDEX idx_ma_tenant_trigger ON public.marketing_automations (tenant_id, trigger_type, status);

CREATE TRIGGER trg_ma_updated_at
  BEFORE UPDATE ON public.marketing_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_select_member"
  ON public.marketing_automations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "ma_insert_owner_admin_manager"
  ON public.marketing_automations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "ma_update_owner_admin_manager"
  ON public.marketing_automations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "ma_delete_owner_admin"
  ON public.marketing_automations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART B: Automation Versions (immutable published snapshots)
-- ============================================================

CREATE TABLE public.marketing_automation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  entry_conditions JSONB NULL,
  re_enrollment_policy TEXT NOT NULL,
  timezone TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_automation_versions IS
  'Immutable published automation version snapshots. Enrollments reference a version. Milestone 15.8.';

ALTER TABLE public.marketing_automation_versions
  ADD CONSTRAINT mav_version_positive CHECK (version_number > 0);

CREATE UNIQUE INDEX idx_mav_automation_version
  ON public.marketing_automation_versions (automation_id, version_number);
CREATE INDEX idx_mav_tenant ON public.marketing_automation_versions (tenant_id);

ALTER TABLE public.marketing_automation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mav_select_member"
  ON public.marketing_automation_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automation_versions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct INSERT/UPDATE/DELETE — managed via service role during publish

-- ============================================================
-- PART C: Automation Steps (within a version)
-- ============================================================

CREATE TABLE public.marketing_automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.marketing_automation_versions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_automation_steps IS
  'Steps within an automation version. Ordered by position. Milestone 15.8.';

ALTER TABLE public.marketing_automation_steps
  ADD CONSTRAINT mas_step_type_check CHECK (
    step_type IN ('delay', 'condition', 'email')
  ),
  ADD CONSTRAINT mas_position_positive CHECK (position >= 0),
  ADD CONSTRAINT mas_config_object CHECK (jsonb_typeof(config) = 'object');

CREATE UNIQUE INDEX idx_mas_version_position
  ON public.marketing_automation_steps (version_id, position);
CREATE INDEX idx_mas_automation ON public.marketing_automation_steps (automation_id);

CREATE TRIGGER trg_mas_updated_at
  BEFORE UPDATE ON public.marketing_automation_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_automation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mas_select_member"
  ON public.marketing_automation_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automation_steps.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct INSERT/UPDATE/DELETE — managed via service role during publish

-- ============================================================
-- PART D: Enrollments (customer journeys)
-- ============================================================

CREATE TABLE public.marketing_automation_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.marketing_automation_versions(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.tenant_customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  current_step_position INTEGER NOT NULL DEFAULT 0,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_run_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  trigger_reference_type TEXT NULL,
  trigger_reference_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_automation_enrollments IS
  'Customer automation enrollments (journeys). One row per customer per automation trigger. Milestone 15.8.';

ALTER TABLE public.marketing_automation_enrollments
  ADD CONSTRAINT mae_status_check CHECK (
    status IN ('active', 'waiting', 'completed', 'cancelled', 'failed')
  ),
  ADD CONSTRAINT mae_position_non_negative CHECK (current_step_position >= 0);

-- Idempotency: prevent duplicate enrollment for same trigger event
CREATE UNIQUE INDEX idx_mae_idempotency
  ON public.marketing_automation_enrollments (automation_id, customer_id, trigger_reference_id)
  WHERE trigger_reference_id IS NOT NULL;

-- For once_ever policy
CREATE UNIQUE INDEX idx_mae_once_ever
  ON public.marketing_automation_enrollments (automation_id, customer_id)
  WHERE trigger_reference_id IS NULL;

-- Processing indexes
CREATE INDEX idx_mae_due_work
  ON public.marketing_automation_enrollments (status, next_run_at)
  WHERE status IN ('active', 'waiting') AND next_run_at IS NOT NULL;

CREATE INDEX idx_mae_tenant_automation ON public.marketing_automation_enrollments (tenant_id, automation_id, status);
CREATE INDEX idx_mae_tenant_customer ON public.marketing_automation_enrollments (tenant_id, customer_id);

CREATE TRIGGER trg_mae_updated_at
  BEFORE UPDATE ON public.marketing_automation_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_automation_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mae_select_member"
  ON public.marketing_automation_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automation_enrollments.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct INSERT/UPDATE/DELETE — managed via service role

-- ============================================================
-- PART E: Step Executions (per-step history)
-- ============================================================

CREATE TABLE public.marketing_automation_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.marketing_automation_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.marketing_automation_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  execution_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  skip_reason TEXT NULL,
  delivery_reference TEXT NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_automation_step_executions IS
  'Per-step execution history for automation enrollments. Prevents duplicate execution. Milestone 15.8.';

ALTER TABLE public.marketing_automation_step_executions
  ADD CONSTRAINT mase_status_check CHECK (
    status IN ('pending', 'executing', 'completed', 'failed', 'skipped')
  );

-- Prevent duplicate step execution for the same enrollment
CREATE UNIQUE INDEX idx_mase_execution_key
  ON public.marketing_automation_step_executions (enrollment_id, execution_key);

CREATE INDEX idx_mase_enrollment ON public.marketing_automation_step_executions (enrollment_id, status);

CREATE TRIGGER trg_mase_updated_at
  BEFORE UPDATE ON public.marketing_automation_step_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_automation_step_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mase_select_member"
  ON public.marketing_automation_step_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = marketing_automation_step_executions.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct INSERT/UPDATE/DELETE — managed via service role

-- ============================================================
-- PART F: Processor RPCs
-- ============================================================

-- Claim due enrollments for processing (batch, concurrency-safe).
CREATE OR REPLACE FUNCTION claim_due_automation_enrollments(
  p_batch_size INTEGER DEFAULT 50,
  p_worker_id TEXT DEFAULT 'automation_worker'
)
RETURNS TABLE(
  enrollment_id UUID,
  tenant_id UUID,
  automation_id UUID,
  version_id UUID,
  customer_id UUID,
  current_step_position INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE marketing_automation_enrollments
    SET status = 'active',
        updated_at = NOW()
    WHERE id IN (
      SELECT mae.id
      FROM marketing_automation_enrollments mae
      WHERE mae.status IN ('active', 'waiting')
        AND mae.next_run_at IS NOT NULL
        AND mae.next_run_at <= NOW()
      ORDER BY mae.next_run_at ASC
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, marketing_automation_enrollments.tenant_id,
              marketing_automation_enrollments.automation_id,
              marketing_automation_enrollments.version_id,
              marketing_automation_enrollments.customer_id,
              marketing_automation_enrollments.current_step_position
  )
  SELECT claimed.id AS enrollment_id,
         claimed.tenant_id,
         claimed.automation_id,
         claimed.version_id,
         claimed.customer_id,
         claimed.current_step_position
  FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_due_automation_enrollments FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_due_automation_enrollments TO service_role;

-- Advance enrollment to next step.
CREATE OR REPLACE FUNCTION advance_automation_enrollment(
  p_enrollment_id UUID,
  p_next_step_position INTEGER,
  p_next_run_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_automation_enrollments
  SET current_step_position = p_next_step_position,
      next_run_at = p_next_run_at,
      status = CASE WHEN p_next_run_at IS NOT NULL THEN 'waiting' ELSE 'active' END,
      updated_at = NOW()
  WHERE id = p_enrollment_id;
END;
$$;

REVOKE ALL ON FUNCTION advance_automation_enrollment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION advance_automation_enrollment TO service_role;

-- Complete enrollment.
CREATE OR REPLACE FUNCTION complete_automation_enrollment(
  p_enrollment_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_automation_enrollments
  SET status = 'completed',
      completed_at = NOW(),
      next_run_at = NULL,
      updated_at = NOW()
  WHERE id = p_enrollment_id
    AND status IN ('active', 'waiting');
END;
$$;

REVOKE ALL ON FUNCTION complete_automation_enrollment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION complete_automation_enrollment TO service_role;

-- Fail enrollment.
CREATE OR REPLACE FUNCTION fail_automation_enrollment(
  p_enrollment_id UUID,
  p_error_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_automation_enrollments
  SET status = 'failed',
      next_run_at = NULL,
      updated_at = NOW()
  WHERE id = p_enrollment_id
    AND status IN ('active', 'waiting');
END;
$$;

REVOKE ALL ON FUNCTION fail_automation_enrollment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fail_automation_enrollment TO service_role;

-- Add FK from marketing_automations.current_version_id now that versions table exists.
ALTER TABLE public.marketing_automations
  ADD CONSTRAINT ma_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES public.marketing_automation_versions(id)
  ON DELETE SET NULL;
