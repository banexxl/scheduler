-- Migration: Fix missing foreign keys on tenant_subscriptions — billing_plans join
--
-- The tenant_subscriptions table has billing_plan_id and billing_plan_price_id
-- columns but no foreign key constraints referencing billing_plans / billing_plan_prices.
-- This prevents PostgREST (Supabase) from resolving joins like:
--   .select("*, billing_plans(name)")
--
-- Root cause: Migration 000022 created the columns via ADD COLUMN IF NOT EXISTS
-- (which doesn't add constraints), and the original CREATE TABLE block only ran
-- if the table didn't already exist.

-- ============================================================
-- 1. Add FK: tenant_subscriptions.billing_plan_id → billing_plans
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_subscriptions_billing_plan_id_fkey'
      AND table_name = 'tenant_subscriptions'
  ) THEN
    ALTER TABLE public.tenant_subscriptions
      ADD CONSTRAINT tenant_subscriptions_billing_plan_id_fkey
      FOREIGN KEY (billing_plan_id)
      REFERENCES public.billing_plans(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 2. Add FK: tenant_subscriptions.billing_plan_price_id → billing_plan_prices
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_subscriptions_billing_plan_price_id_fkey'
      AND table_name = 'tenant_subscriptions'
  ) THEN
    ALTER TABLE public.tenant_subscriptions
      ADD CONSTRAINT tenant_subscriptions_billing_plan_price_id_fkey
      FOREIGN KEY (billing_plan_price_id)
      REFERENCES public.billing_plan_prices(id)
      ON DELETE SET NULL;
  END IF;
END $$;
