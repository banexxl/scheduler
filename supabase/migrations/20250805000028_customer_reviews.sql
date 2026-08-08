-- Migration: Customer Reviews & Feedback (Milestone 8.7)
-- Introduces review tokens, customer reviews, review settings,
-- and extends notification template types.

-- ============================================================
-- PART A: Customer Reviews Table
-- ============================================================

CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id uuid NULL,
  service_id uuid NULL REFERENCES public.services(id) ON DELETE SET NULL,
  resource_id uuid NULL REFERENCES public.resources(id) ON DELETE SET NULL,
  location_id uuid NULL REFERENCES public.locations(id) ON DELETE SET NULL,
  rating smallint NOT NULL,
  comment text NULL,
  status text NOT NULL DEFAULT 'published',
  is_featured boolean NOT NULL DEFAULT false,
  service_name_snapshot text NULL,
  resource_name_snapshot text NULL,
  customer_name_snapshot text NULL,
  business_response text NULL,
  responded_at timestamptz NULL,
  responded_by uuid NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cr_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT cr_status_check CHECK (status IN ('published', 'hidden', 'flagged')),
  CONSTRAINT cr_comment_max CHECK (comment IS NULL OR char_length(comment) <= 2000),
  CONSTRAINT cr_response_max CHECK (business_response IS NULL OR char_length(business_response) <= 2000),
  CONSTRAINT cr_one_review_per_appointment UNIQUE (tenant_id, appointment_id)
);

CREATE INDEX idx_cr_tenant ON public.customer_reviews (tenant_id, submitted_at DESC);
CREATE INDEX idx_cr_tenant_status ON public.customer_reviews (tenant_id, status, submitted_at DESC);
CREATE INDEX idx_cr_tenant_service ON public.customer_reviews (tenant_id, service_id);
CREATE INDEX idx_cr_tenant_resource ON public.customer_reviews (tenant_id, resource_id);
CREATE INDEX idx_cr_tenant_rating ON public.customer_reviews (tenant_id, rating);
CREATE INDEX idx_cr_appointment ON public.customer_reviews (appointment_id);

CREATE TRIGGER trg_cr_updated_at
  BEFORE UPDATE ON public.customer_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.customer_reviews IS
  'Customer reviews linked to completed appointments. One per appointment. Milestone 8.7.';

-- ============================================================
-- PART B: Appointment Review Tokens
-- ============================================================

CREATE TABLE public.appointment_review_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT art_hash_format CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT art_prefix_format CHECK (token_prefix ~ '^[A-Za-z0-9_-]{6,20}$'),
  CONSTRAINT art_expiry_after_create CHECK (expires_at > created_at)
);

ALTER TABLE public.appointment_review_tokens
  ADD CONSTRAINT art_hash_unique UNIQUE (token_hash);

CREATE UNIQUE INDEX uq_art_active_per_appointment
  ON public.appointment_review_tokens (appointment_id)
  WHERE revoked_at IS NULL AND used_at IS NULL;

CREATE INDEX idx_art_tenant ON public.appointment_review_tokens (tenant_id);
CREATE INDEX idx_art_appointment ON public.appointment_review_tokens (appointment_id);

COMMENT ON TABLE public.appointment_review_tokens IS
  'Secure tokens for customer review submission. One active per appointment. Milestone 8.7.';

-- ============================================================
-- PART C: Review Settings (extend tenant_notification_settings)
-- ============================================================

ALTER TABLE public.tenant_notification_settings
  ADD COLUMN IF NOT EXISTS review_requests_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_request_delay_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS show_public_reviews boolean NOT NULL DEFAULT false;

ALTER TABLE public.tenant_notification_settings
  ADD CONSTRAINT tns_review_delay_range CHECK (review_request_delay_minutes BETWEEN 0 AND 10080);

-- ============================================================
-- PART D: RLS
-- ============================================================

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_review_tokens ENABLE ROW LEVEL SECURITY;

-- Reviews: tenant members can read
CREATE POLICY "cr_select_member"
  ON public.customer_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_reviews.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Reviews: owner/admin can update (moderation, response)
CREATE POLICY "cr_update_owner_admin"
  ON public.customer_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = customer_reviews.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

-- No direct client INSERT — handled via trusted server actions
REVOKE ALL ON TABLE public.appointment_review_tokens FROM anon;
REVOKE ALL ON TABLE public.appointment_review_tokens FROM authenticated;

-- ============================================================
-- PART E: Extend Notification Template Types
-- ============================================================

ALTER TABLE public.notification_outbox DROP CONSTRAINT no_event_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_event_type_check CHECK (
    event_type IN (
      'appointment_created',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'customer_portal_access',
      'appointment_review_request'
    )
  );

ALTER TABLE public.notification_outbox DROP CONSTRAINT no_template_type_check;
ALTER TABLE public.notification_outbox
  ADD CONSTRAINT no_template_type_check CHECK (
    template_type IN (
      'appointment_created',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'customer_portal_access',
      'appointment_review_request'
    )
  );

ALTER TABLE public.notification_templates DROP CONSTRAINT nt_template_type_check;
ALTER TABLE public.notification_templates
  ADD CONSTRAINT nt_template_type_check CHECK (
    template_type IN (
      'appointment_created',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'customer_portal_access',
      'appointment_review_request'
    )
  );

-- ============================================================
-- END OF MIGRATION
-- ============================================================
