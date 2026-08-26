-- Migration: Allow authenticated users to read active public billing plans.
--
-- The existing RLS policies on billing_plans only allow platform admins to
-- SELECT. This blocks regular users from:
-- 1. Viewing plans on the pricing / create-business page
-- 2. The create_tenant RPC's internal plan validation (if SECURITY INVOKER)
--
-- This policy grants all authenticated users read access to active, public plans.

CREATE POLICY billing_plans_authenticated_read
  ON public.billing_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true AND is_public = true);

-- Also allow authenticated users to read prices for active plans
-- (needed for displaying pricing on the create-business page)
CREATE POLICY billing_plan_prices_authenticated_read
  ON public.billing_plan_prices
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.billing_plans bp
      WHERE bp.id = billing_plan_prices.billing_plan_id
        AND bp.is_active = true
        AND bp.is_public = true
    )
  );
