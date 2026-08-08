-- Migration: Customer Loyalty & Rewards (Milestone 8.10)
-- Introduces loyalty settings, customer accounts, transaction ledger,
-- reward definitions, and redemption tracking.

-- ============================================================
-- PART A: Tenant Loyalty Settings
-- ============================================================

CREATE TABLE public.tenant_loyalty_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  points_per_completed_appointment integer NOT NULL DEFAULT 0,
  count_completed_visits boolean NOT NULL DEFAULT true,
  allow_manual_adjustments boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id),
  CONSTRAINT tls_points_non_negative CHECK (points_per_completed_appointment >= 0),
  CONSTRAINT tls_points_max CHECK (points_per_completed_appointment <= 1000)
);

CREATE TRIGGER trg_tls_updated_at
  BEFORE UPDATE ON public.tenant_loyalty_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART B: Customer Loyalty Accounts
-- ============================================================

CREATE TABLE public.customer_loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_points_earned integer NOT NULL DEFAULT 0,
  completed_visit_count integer NOT NULL DEFAULT 0,
  last_earned_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, customer_id),
  CONSTRAINT cla_balance_non_negative CHECK (points_balance >= 0),
  CONSTRAINT cla_lifetime_non_negative CHECK (lifetime_points_earned >= 0),
  CONSTRAINT cla_visits_non_negative CHECK (completed_visit_count >= 0)
);

CREATE INDEX idx_cla_tenant ON public.customer_loyalty_accounts (tenant_id);
CREATE INDEX idx_cla_customer ON public.customer_loyalty_accounts (tenant_id, customer_id);

CREATE TRIGGER trg_cla_updated_at
  BEFORE UPDATE ON public.customer_loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART C: Customer Loyalty Transactions (Ledger)
-- ============================================================

CREATE TABLE public.customer_loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_loyalty_account_id uuid NOT NULL REFERENCES public.customer_loyalty_accounts(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  appointment_id uuid NULL REFERENCES public.appointments(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  points_delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NULL,
  created_by uuid NULL,
  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clt_type_check CHECK (
    transaction_type IN ('earned', 'manual_credit', 'manual_debit', 'reversal', 'reward_redemption')
  ),
  CONSTRAINT clt_reason_max CHECK (reason IS NULL OR char_length(reason) <= 500),
  CONSTRAINT clt_balance_non_negative CHECK (balance_after >= 0)
);

CREATE UNIQUE INDEX uq_clt_idempotency
  ON public.customer_loyalty_transactions (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_clt_account ON public.customer_loyalty_transactions (customer_loyalty_account_id, created_at DESC);
CREATE INDEX idx_clt_appointment ON public.customer_loyalty_transactions (appointment_id) WHERE appointment_id IS NOT NULL;

-- ============================================================
-- PART D: Loyalty Rewards
-- ============================================================

CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NULL,
  reward_type text NOT NULL,
  points_required integer NULL,
  visits_required integer NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lr_name_length CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  CONSTRAINT lr_description_max CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT lr_type_check CHECK (reward_type IN ('points_threshold', 'visit_threshold')),
  CONSTRAINT lr_points_required CHECK (
    reward_type <> 'points_threshold' OR (points_required IS NOT NULL AND points_required >= 1)
  ),
  CONSTRAINT lr_visits_required CHECK (
    reward_type <> 'visit_threshold' OR (visits_required IS NOT NULL AND visits_required >= 1)
  ),
  CONSTRAINT lr_sort_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX idx_lr_tenant ON public.loyalty_rewards (tenant_id);
CREATE INDEX idx_lr_tenant_active ON public.loyalty_rewards (tenant_id, is_active);

CREATE TRIGGER trg_lr_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART E: Customer Reward Redemptions
-- ============================================================

CREATE TABLE public.customer_reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  loyalty_reward_id uuid NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE RESTRICT,
  customer_loyalty_account_id uuid NOT NULL REFERENCES public.customer_loyalty_accounts(id) ON DELETE CASCADE,
  points_spent integer NOT NULL DEFAULT 0,
  visits_threshold_snapshot integer NULL,
  reward_name_snapshot text NOT NULL,
  note text NULL,
  redeemed_by uuid NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crr_points_non_negative CHECK (points_spent >= 0),
  CONSTRAINT crr_note_max CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX idx_crr_customer ON public.customer_reward_redemptions (tenant_id, customer_id);
CREATE INDEX idx_crr_reward ON public.customer_reward_redemptions (loyalty_reward_id);

-- ============================================================
-- PART F: Award Loyalty Points RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_customer_loyalty_points(
  p_tenant_id uuid,
  p_customer_id uuid,
  p_appointment_id uuid,
  p_points integer,
  p_count_visit boolean DEFAULT true,
  p_idempotency_key text DEFAULT NULL
)
RETURNS public.customer_loyalty_accounts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account public.customer_loyalty_accounts;
  v_new_balance integer;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.customer_loyalty_transactions
      WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key
    ) THEN
      -- Already awarded — return current account
      SELECT * INTO v_account
      FROM public.customer_loyalty_accounts
      WHERE tenant_id = p_tenant_id AND customer_id = p_customer_id;
      RETURN v_account;
    END IF;
  END IF;

  -- Upsert loyalty account
  INSERT INTO public.customer_loyalty_accounts (tenant_id, customer_id)
  VALUES (p_tenant_id, p_customer_id)
  ON CONFLICT (tenant_id, customer_id) DO NOTHING;

  -- Lock and update
  SELECT * INTO v_account
  FROM public.customer_loyalty_accounts
  WHERE tenant_id = p_tenant_id AND customer_id = p_customer_id
  FOR UPDATE;

  v_new_balance := v_account.points_balance + p_points;

  UPDATE public.customer_loyalty_accounts
  SET
    points_balance = v_new_balance,
    lifetime_points_earned = lifetime_points_earned + p_points,
    completed_visit_count = CASE WHEN p_count_visit THEN completed_visit_count + 1 ELSE completed_visit_count END,
    last_earned_at = now()
  WHERE id = v_account.id
  RETURNING * INTO v_account;

  -- Insert ledger transaction
  INSERT INTO public.customer_loyalty_transactions (
    tenant_id, customer_loyalty_account_id, customer_id, appointment_id,
    transaction_type, points_delta, balance_after, idempotency_key
  ) VALUES (
    p_tenant_id, v_account.id, p_customer_id, p_appointment_id,
    'earned', p_points, v_new_balance, p_idempotency_key
  );

  RETURN v_account;
END;
$$;

COMMENT ON FUNCTION public.award_customer_loyalty_points IS
  'Awards loyalty points for a completed appointment. Idempotent via key. Concurrency-safe via row lock.';

-- ============================================================
-- PART G: RLS
-- ============================================================

ALTER TABLE public.tenant_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Members read all
CREATE POLICY "tls_select_member" ON public.tenant_loyalty_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_loyalty_settings.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "cla_select_member" ON public.customer_loyalty_accounts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_loyalty_accounts.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "clt_select_member" ON public.customer_loyalty_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_loyalty_transactions.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "lr_select_member" ON public.loyalty_rewards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = loyalty_rewards.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "crr_select_member" ON public.customer_reward_redemptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_reward_redemptions.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

-- Owner/admin mutations for settings/rewards
CREATE POLICY "tls_upsert_owner_admin" ON public.tenant_loyalty_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_loyalty_settings.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "tls_update_owner_admin" ON public.tenant_loyalty_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenant_loyalty_settings.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "lr_insert_owner_admin" ON public.loyalty_rewards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = loyalty_rewards.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "lr_update_owner_admin" ON public.loyalty_rewards FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = loyalty_rewards.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

-- ============================================================
-- END OF MIGRATION
-- ============================================================
