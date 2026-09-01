-- Migration: Add features column to billing_plans
--
-- Stores an ordered list of feature bullet strings shown on marketing
-- pricing cards. Managed from the platform admin plan form.
-- NULL/empty array = no feature bullets (card falls back to description only).

ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.billing_plans.features IS 'Ordered list of feature bullet strings displayed on marketing pricing cards.';
