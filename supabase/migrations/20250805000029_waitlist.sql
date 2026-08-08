-- Migration: Waitlist & Cancellation Slot Recovery (Milestone 8.8)
-- Introduces waitlist entries, offers, settings, and extends notification types.

-- ============================================================
-- PART A: Waitlist Entries
-- ============================================================

CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  resource_id uuid NULL REFERENCES public.resources(id) ON DELETE SET NULL,
  customer_id uuid NULL,
  customer_name text NOT NULL,
  customer_email text NULL,
  customer_phone text NULL,
  preferred_date_from date NOT NULL,
  preferred_date_to date NOT NULL,
  preferred_time_from time NULL,
  preferred_time_to time NULL,
  allow_any_resource boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT we_status_check CHECK (status IN ('active', 'matched', 'booked', 'expired', 'cancelled')),
  CONSTRAINT we_name_length CHECK (char_length(trim(customer_name)) BETWEEN 1 AND 160),
  CONSTRAINT we_email_format CHECK (
    customer_email IS NULL OR (
      char_length(customer_email) BETWEEN 5 AND 320
      AND customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  ),
  CONSTRAINT we_phone_length CHECK (
    customer_phone IS NULL OR char_length(customer_phone) BETWEEN 3 AND 30
  ),
  CONSTRAINT we_date_range_valid CHECK (preferred_date_from <= preferred_date_to),
  CONSTRAINT we_date_range_max CHECK (preferred_date_to - preferred_date_from <= 30),
  CONSTRAINT we_time_range_valid CHECK (
    preferred_time_from IS NULL OR preferred_time_to IS NULL
    OR preferred_time_from < preferred_time_to
  ),
  CONSTRAINT we_notes_max CHECK (notes IS NULL OR char_length(notes) <= 1000),
  CONSTRAINT we_resource_required_when_not_any CHECK (
    allow_any_resource = true OR resource_id IS NOT NULL
  )
);

CREATE INDEX idx_we_tenant ON public.waitlist_entries (tenant_id);
CREATE INDEX idx_we_tenant_status ON public.waitlist_entries (tenant_id, status);
CREATE INDEX idx_we_tenant_service ON public.waitlist_entries (tenant_id, service_id, location_id, status);
CREATE INDEX idx_we_tenant_dates ON public.waitlist_entries (tenant_id, preferred_date_from, preferred_date_to)
  WHERE status = 'active';
CREATE INDEX idx_we_email ON public.waitlist_entries (tenant_id, customer_email)
  WHERE customer_email IS NOT NULL AND status = 'active';

CREATE TRIGGER trg_we_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.waitlist_entries IS
  'Customer waitlist entries for unavailable appointment slots. Milestone 8.8.';

-- ============================================================
-- PART B: Waitlist Offers
-- ============================================================

CREATE TABLE public.waitlist_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  waitlist_entry_id uuid NOT NULL REFERENCES public.waitlist_entries(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  token_hash text NULL,
  token_prefix text NULL,
  notification_outbox_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wo_status_check CHECK (status IN ('pending', 'notified', 'accepted', 'expired', 'cancelled', 'stale')),
  CONSTRAINT wo_token_hash_format CHECK (token_hash IS NULL OR token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT wo_token_prefix_format CHECK (token_prefix IS NULL OR token_prefix ~ '^[A-Za-z0-9_-]{6,20}$'),
  CONSTRAINT wo_time_valid CHECK (starts_at < ends_at)
);

-- Prevent duplicate active offers for same entry+resource+time
CREATE UNIQUE INDEX uq_wo_active_offer
  ON public.waitlist_offers (waitlist_entry_id, resource_id, starts_at)
  WHERE status IN ('pending', 'notified');

CREATE INDEX idx_wo_tenant ON public.waitlist_offers (tenant_id);
CREATE INDEX idx_wo_entry ON public.waitlist_offers (waitlist_entry_id);
CREATE INDEX idx_wo_token ON public.waitlist_offers (token_hash) WHERE token_hash IS NOT NULL;
CREATE INDEX idx_wo_expires ON public.waitlist_offers (status, expires_at)
  WHERE status IN ('pending', 'notified');

CREATE TRIGGER trg_wo_updated_at
  BEFORE UPDATE ON public.waitlist_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.waitlist_offers IS
  'Offers generated when matching availability opens for a waitlist entry. Milestone 8.8.';

-- ============================================================
-- PART C: Tenant Consistency Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_waitlist_entry_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.services s WHERE s.id = NEW.service_id AND s.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Service does not belong to tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.id = NEW.location_id AND l.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Location does not belong to tenant';
  END IF;

  IF NEW.resource_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.resources r WHERE r.id = NEW.resource_id AND r.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Resource does not belong to tenant';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verify_waitlist_entry_tenant
  BEFORE INSERT OR UPDATE OF tenant_id, service_id, location_id, resource_id
  ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.verify_waitlist_entry_tenant();

-- ============================================================
-- PART D: Waitlist Settings (extend tenant_notification_settings)
-- ============================================================

ALTER TABLE public.tenant_notification_settings
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS waitlist_offer_expiry_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS waitlist_max_date_range_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS waitlist_notify_batch_size integer NOT NULL DEFAULT 3;

ALTER TABLE public.tenant_notification_settings
  ADD CONSTRAINT tns_waitlist_expiry_range CHECK (waitlist_offer_expiry_minutes BETWEEN 5 AND 1440),
  ADD CONSTRAINT tns_waitlist_range_max CHECK (waitlist_max_date_range_days BETWEEN 1 AND 90),
  ADD CONSTRAINT tns_waitlist_batch_range CHECK (waitlist_notify_batch_size BETWEEN 1 AND 10);

-- ============================================================
-- PART E: RLS
-- ============================================================

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "we_select_member"
  ON public.waitlist_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = waitlist_entries.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "wo_select_member"
  ON public.waitlist_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = waitlist_offers.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct public INSERT/UPDATE — via trusted server actions
REVOKE ALL ON TABLE public.waitlist_entries FROM anon;
REVOKE ALL ON TABLE public.waitlist_offers FROM anon;

-- ============================================================
-- PART F: Extend Notification Template Types
-- ============================================================

ALTER TABLE public.notification_outbox DROP CONSTRAINT no_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_event_type_check CHECK (
    event_type IN (
      'appointment_created', 'appointment_rescheduled', 'appointment_cancelled',
      'appointment_reminder', 'customer_portal_access', 'appointment_review_request',
      'waitlist_slot_available'
    )
  );

ALTER TABLE public.notification_outbox DROP CONSTRAINT no_template_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_template_type_check CHECK (
    template_type IN (
      'appointment_created', 'appointment_rescheduled', 'appointment_cancelled',
      'appointment_reminder', 'customer_portal_access', 'appointment_review_request',
      'waitlist_slot_available'
    )
  );

ALTER TABLE public.notification_templates DROP CONSTRAINT nt_template_type_check;
ALTER TABLE public.notification_templates
  ADD CONSTRAINT nt_template_type_check CHECK (
    template_type IN (
      'appointment_created', 'appointment_rescheduled', 'appointment_cancelled',
      'appointment_reminder', 'customer_portal_access', 'appointment_review_request',
      'waitlist_slot_available'
    )
  );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
