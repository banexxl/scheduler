-- Migration: Customer Favorites (Milestone 9.3)
-- Introduces favorite businesses, services, and resources
-- for the global customer account.

-- ============================================================
-- PART A: Favorite Businesses
-- ============================================================

CREATE TABLE public.customer_favorite_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_account_id, tenant_id)
);

CREATE INDEX idx_cft_account ON public.customer_favorite_tenants (customer_account_id);

-- ============================================================
-- PART B: Favorite Services
-- ============================================================

CREATE TABLE public.customer_favorite_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_account_id, tenant_id, service_id)
);

CREATE INDEX idx_cfs_account ON public.customer_favorite_services (customer_account_id);

-- ============================================================
-- PART C: Favorite Resources
-- ============================================================

CREATE TABLE public.customer_favorite_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_account_id, tenant_id, resource_id)
);

CREATE INDEX idx_cfr_account ON public.customer_favorite_resources (customer_account_id);

-- ============================================================
-- PART D: Tenant Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_customer_favorite_service_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = NEW.service_id AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to tenant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_cfs_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, service_id
  ON public.customer_favorite_services
  FOR EACH ROW EXECUTE FUNCTION public.verify_customer_favorite_service_tenant();

CREATE OR REPLACE FUNCTION public.verify_customer_favorite_resource_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.resources r
    WHERE r.id = NEW.resource_id AND r.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to tenant';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_cfr_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, resource_id
  ON public.customer_favorite_resources
  FOR EACH ROW EXECUTE FUNCTION public.verify_customer_favorite_resource_tenant();

-- ============================================================
-- PART E: RLS
-- ============================================================

ALTER TABLE public.customer_favorite_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_favorite_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_favorite_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cft_select_own" ON public.customer_favorite_tenants FOR SELECT
  USING (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cft_insert_own" ON public.customer_favorite_tenants FOR INSERT
  WITH CHECK (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cft_delete_own" ON public.customer_favorite_tenants FOR DELETE
  USING (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cfs_select_own" ON public.customer_favorite_services FOR SELECT
  USING (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cfs_insert_own" ON public.customer_favorite_services FOR INSERT
  WITH CHECK (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cfs_delete_own" ON public.customer_favorite_services FOR DELETE
  USING (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cfr_select_own" ON public.customer_favorite_resources FOR SELECT
  USING (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cfr_insert_own" ON public.customer_favorite_resources FOR INSERT
  WITH CHECK (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

CREATE POLICY "cfr_delete_own" ON public.customer_favorite_resources FOR DELETE
  USING (customer_account_id IN (SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()));

-- ============================================================
-- END OF MIGRATION
-- ============================================================
