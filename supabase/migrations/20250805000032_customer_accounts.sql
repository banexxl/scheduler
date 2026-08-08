-- Migration: Customer Accounts & Identity Linking (Milestone 9.1)
-- Introduces global customer accounts and tenant-customer linking.

-- ============================================================
-- PART A: Customer Accounts
-- ============================================================

CREATE TABLE public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NULL,
  email text NOT NULL,
  phone text NULL,
  avatar_url text NULL,
  preferred_language text NULL,
  is_active boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ca_email_format CHECK (
    char_length(email) BETWEEN 3 AND 320
    AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  CONSTRAINT ca_name_max CHECK (full_name IS NULL OR char_length(full_name) <= 200),
  CONSTRAINT ca_phone_max CHECK (phone IS NULL OR char_length(phone) <= 30)
);

CREATE INDEX idx_ca_email ON public.customer_accounts (email);
CREATE INDEX idx_ca_user ON public.customer_accounts (user_id);

CREATE TRIGGER trg_ca_updated_at
  BEFORE UPDATE ON public.customer_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.customer_accounts IS
  'Global customer accounts linked to Supabase auth. One per auth user. Milestone 9.1.';

-- ============================================================
-- PART B: Customer Account Tenant Links
-- ============================================================

CREATE TABLE public.customer_account_tenant_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_customer_id uuid NOT NULL,
  link_status text NOT NULL DEFAULT 'linked',
  link_method text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catl_status_check CHECK (link_status IN ('pending', 'linked', 'revoked', 'conflict')),
  CONSTRAINT catl_method_check CHECK (
    link_method IN ('account_registration', 'verified_email', 'portal_session', 'appointment_claim', 'manual_support')
  ),
  UNIQUE (tenant_id, tenant_customer_id),
  UNIQUE (customer_account_id, tenant_id, tenant_customer_id)
);

CREATE INDEX idx_catl_account ON public.customer_account_tenant_links (customer_account_id);
CREATE INDEX idx_catl_tenant ON public.customer_account_tenant_links (tenant_id, tenant_customer_id);
CREATE INDEX idx_catl_status ON public.customer_account_tenant_links (customer_account_id, link_status);

COMMENT ON TABLE public.customer_account_tenant_links IS
  'Links global customer accounts to tenant-scoped customer records. Milestone 9.1.';

-- ============================================================
-- PART C: Tenant Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_customer_account_link_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_customers tc
    WHERE tc.id = NEW.tenant_customer_id AND tc.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant customer does not belong to tenant';
  END IF;

  -- Prevent linking a tenant customer to multiple accounts
  IF NEW.link_status = 'linked' AND EXISTS (
    SELECT 1 FROM public.customer_account_tenant_links
    WHERE tenant_id = NEW.tenant_id
      AND tenant_customer_id = NEW.tenant_customer_id
      AND link_status = 'linked'
      AND id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Tenant customer is already linked to another account';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_catl_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, tenant_customer_id, link_status
  ON public.customer_account_tenant_links
  FOR EACH ROW EXECUTE FUNCTION public.verify_customer_account_link_tenant();

-- ============================================================
-- PART D: RLS
-- ============================================================

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_account_tenant_links ENABLE ROW LEVEL SECURITY;

-- Customer can read/update own account
CREATE POLICY "ca_select_own" ON public.customer_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ca_update_own" ON public.customer_accounts FOR UPDATE
  USING (user_id = auth.uid());

-- Customer can read own links
CREATE POLICY "catl_select_own" ON public.customer_account_tenant_links FOR SELECT
  USING (
    customer_account_id IN (
      SELECT id FROM public.customer_accounts WHERE user_id = auth.uid()
    )
  );

-- Tenant members can read links for their tenant
CREATE POLICY "catl_select_tenant_member" ON public.customer_account_tenant_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_account_tenant_links.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct client INSERT/UPDATE on links — via trusted server actions

-- ============================================================
-- END OF MIGRATION
-- ============================================================
