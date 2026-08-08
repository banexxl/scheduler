-- Migration: Customer Notification Preferences (Milestone 9.4)
-- Introduces per-tenant customer communication preferences.

-- ============================================================
-- PART A: Customer Notification Preferences
-- ============================================================

CREATE TABLE public.customer_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tenant_customer_id uuid NOT NULL,
  appointment_reminders_enabled boolean NOT NULL DEFAULT true,
  review_requests_enabled boolean NOT NULL DEFAULT true,
  waitlist_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, tenant_customer_id)
);

CREATE INDEX idx_cnp_tenant ON public.customer_notification_preferences (tenant_id);
CREATE INDEX idx_cnp_customer ON public.customer_notification_preferences (tenant_id, tenant_customer_id);

CREATE TRIGGER trg_cnp_updated_at
  BEFORE UPDATE ON public.customer_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.customer_notification_preferences IS
  'Per-tenant customer communication preferences for optional notifications. Milestone 9.4.';

-- ============================================================
-- PART B: RLS
-- ============================================================

ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Tenant members can read customer preferences
CREATE POLICY "cnp_select_member" ON public.customer_notification_preferences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = customer_notification_preferences.tenant_id
      AND tm.user_id = auth.uid() AND tm.status = 'active'
  ));

-- Customer can read own preferences via account link
CREATE POLICY "cnp_select_own_customer" ON public.customer_notification_preferences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.customer_account_tenant_links catl
    INNER JOIN public.customer_accounts ca ON ca.id = catl.customer_account_id
    WHERE catl.tenant_id = customer_notification_preferences.tenant_id
      AND catl.tenant_customer_id = customer_notification_preferences.tenant_customer_id
      AND catl.link_status = 'linked'
      AND ca.user_id = auth.uid()
  ));

-- No direct client mutations — via trusted server actions

-- ============================================================
-- END OF MIGRATION
-- ============================================================
