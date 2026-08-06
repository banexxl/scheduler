-- Migration: Public Booking Foundation (Milestone 6.11)
-- Introduces tenant public booking settings, idempotency tracking,
-- and extends the appointment source constraint.

-- ============================================================
-- PART A: Extend Appointment Source Constraint
-- ============================================================

-- Drop and recreate the source check to add 'public_booking'
ALTER TABLE public.appointments DROP CONSTRAINT appt_source_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appt_source_check CHECK (
    source IN ('internal', 'online', 'walk_in', 'phone', 'public_booking')
  );

-- ============================================================
-- PART B: Tenant Public Booking Settings
-- ============================================================

CREATE TABLE public.tenant_public_booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  allow_resource_selection boolean NOT NULL DEFAULT true,
  allow_no_preference boolean NOT NULL DEFAULT true,
  show_service_prices boolean NOT NULL DEFAULT true,
  show_service_duration boolean NOT NULL DEFAULT true,
  show_resource_names boolean NOT NULL DEFAULT true,
  booking_page_title text NULL,
  booking_page_description text NULL,
  confirmation_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

COMMENT ON TABLE public.tenant_public_booking_settings IS
  'Tenant-level configuration for the public booking flow. One row per tenant.';

-- Constraints
ALTER TABLE public.tenant_public_booking_settings
  ADD CONSTRAINT tpbs_title_max CHECK (
    booking_page_title IS NULL OR char_length(booking_page_title) <= 160
  ),
  ADD CONSTRAINT tpbs_description_max CHECK (
    booking_page_description IS NULL OR char_length(booking_page_description) <= 2000
  ),
  ADD CONSTRAINT tpbs_confirmation_max CHECK (
    confirmation_message IS NULL OR char_length(confirmation_message) <= 2000
  );

-- Indexes
CREATE INDEX idx_tpbs_tenant ON public.tenant_public_booking_settings (tenant_id);

-- Updated-at trigger
CREATE TRIGGER trg_tpbs_updated_at
  BEFORE UPDATE ON public.tenant_public_booking_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART C: RLS for Public Booking Settings
-- ============================================================

ALTER TABLE public.tenant_public_booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tpbs_select_member"
  ON public.tenant_public_booking_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "tpbs_insert_owner_admin"
  ON public.tenant_public_booking_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tpbs_update_owner_admin"
  ON public.tenant_public_booking_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tpbs_delete_owner_admin"
  ON public.tenant_public_booking_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_public_booking_settings.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PART D: Public Booking Requests (Idempotency)
-- ============================================================

CREATE TABLE public.public_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  appointment_id uuid NULL REFERENCES public.appointments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  UNIQUE (tenant_id, idempotency_key)
);

COMMENT ON TABLE public.public_booking_requests IS
  'Idempotency tracking for public booking submissions. Prevents duplicate appointments from retries.';

-- Status check
ALTER TABLE public.public_booking_requests
  ADD CONSTRAINT pbr_status_check CHECK (
    status IN ('processing', 'completed', 'failed', 'conflict')
  );

-- Indexes
CREATE INDEX idx_pbr_tenant ON public.public_booking_requests (tenant_id);
CREATE INDEX idx_pbr_tenant_key ON public.public_booking_requests (tenant_id, idempotency_key);
CREATE INDEX idx_pbr_created ON public.public_booking_requests (created_at);

-- RLS: No public access. Controlled via SECURITY DEFINER functions or service-role only.
ALTER TABLE public.public_booking_requests ENABLE ROW LEVEL SECURITY;

-- Internal members may view for debugging
CREATE POLICY "pbr_select_owner_admin"
  ON public.public_booking_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = public_booking_requests.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- No public INSERT/UPDATE/DELETE policies — managed via server-side only

-- ============================================================
-- PART E: Idempotency Claim RPC
-- ============================================================

-- Atomically claims an idempotency key. Returns the existing record if already claimed.
-- This uses INSERT ON CONFLICT to ensure atomicity.

CREATE OR REPLACE FUNCTION public.claim_public_booking_request(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_request_hash text
)
RETURNS public.public_booking_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result public.public_booking_requests;
BEGIN
  -- Try to insert a new claim
  INSERT INTO public.public_booking_requests (tenant_id, idempotency_key, request_hash, status)
  VALUES (p_tenant_id, p_idempotency_key, p_request_hash, 'processing')
  ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

  -- Load the record (either just inserted or already existing)
  SELECT * INTO v_result
  FROM public.public_booking_requests
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.claim_public_booking_request IS
  'Atomically claims an idempotency key for public booking. Returns existing record if already claimed.';

-- ============================================================
-- PART F: Complete Booking Request RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_public_booking_request(
  p_tenant_id uuid,
  p_idempotency_key uuid,
  p_appointment_id uuid,
  p_status text DEFAULT 'completed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.public_booking_requests
  SET
    appointment_id = p_appointment_id,
    status = p_status,
    completed_at = now()
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
END;
$$;

COMMENT ON FUNCTION public.complete_public_booking_request IS
  'Marks a public booking request as completed with the resulting appointment ID.';

-- ============================================================
-- PART G: Stale Request Cleanup
-- ============================================================

-- Stale 'processing' requests older than 5 minutes are considered abandoned.
-- A scheduled job or manual cleanup can mark them as 'failed'.
-- This is not automated in this migration but documented.

-- ============================================================
-- END OF MIGRATION
-- ============================================================
