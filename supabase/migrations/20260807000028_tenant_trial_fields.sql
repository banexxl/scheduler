-- Migration: Tenant Trial & Billing Lifecycle Fields — Milestone 15.14
--
-- Adds trial tracking fields to the tenants table.
-- Subscription status is NOT duplicated here — it lives in tenant_subscriptions.
-- These fields track ONLY the one-time free trial.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.trial_started_at IS 'When the 14-day free trial was initiated. NULL = never started.';
COMMENT ON COLUMN public.tenants.trial_ends_at IS 'When the free trial expires. NULL = no trial or permanent access.';
COMMENT ON COLUMN public.tenants.trial_used IS 'Whether the tenant has already consumed their one-time free trial.';
