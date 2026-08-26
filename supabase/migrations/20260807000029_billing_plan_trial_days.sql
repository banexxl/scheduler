-- Migration: Add trial_days column to billing_plans
--
-- Stores the number of free trial days for a plan.
-- This value is set during plan creation and synced from Polar's
-- trial_interval / trial_interval_count product fields.

ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS trial_days integer NULL;

COMMENT ON COLUMN public.billing_plans.trial_days IS 'Number of free trial days before the first charge. NULL or 0 = no trial.';

-- Backfill: no existing plans have trials, so nothing to do.
