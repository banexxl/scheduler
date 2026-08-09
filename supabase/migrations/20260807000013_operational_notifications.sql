-- Milestone 12.5 — Business Notification Center & Operational Inbox
-- =================================================================

-- ─── Operational Notifications ───────────────────────────────────────────────

CREATE TABLE public.tenant_operational_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  category TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',

  title TEXT NOT NULL,
  message TEXT NULL,

  entity_type TEXT NULL,
  entity_id UUID NULL,

  resource_id UUID NULL,
  customer_id UUID NULL,

  action_url TEXT NULL,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  deduplication_key TEXT NULL,

  resolved_at TIMESTAMPTZ NULL,
  resolved_by UUID NULL,
  resolution_note TEXT NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.tenant_operational_notifications IS
  'Internal business operational inbox. Separate from customer notification outbox. Milestone 12.5.';

ALTER TABLE public.tenant_operational_notifications
  ADD CONSTRAINT ton_category_check CHECK (
    category IN ('appointments', 'customers', 'reviews', 'waitlist', 'payments', 'communications', 'team', 'system')
  ),
  ADD CONSTRAINT ton_severity_check CHECK (
    severity IN ('info', 'attention', 'warning', 'critical')
  ),
  ADD CONSTRAINT ton_title_length CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  ADD CONSTRAINT ton_metadata_object CHECK (jsonb_typeof(metadata) = 'object'),
  ADD CONSTRAINT ton_resolution_note_length CHECK (
    resolution_note IS NULL OR char_length(resolution_note) <= 1000
  );

-- Deduplication (prevents duplicate notifications from idempotent webhook replay)
CREATE UNIQUE INDEX idx_ton_dedup
  ON public.tenant_operational_notifications (tenant_id, deduplication_key)
  WHERE deduplication_key IS NOT NULL;

CREATE INDEX idx_ton_tenant_occurred ON public.tenant_operational_notifications (tenant_id, occurred_at DESC);
CREATE INDEX idx_ton_tenant_category ON public.tenant_operational_notifications (tenant_id, category, occurred_at DESC);
CREATE INDEX idx_ton_tenant_unresolved ON public.tenant_operational_notifications (tenant_id, occurred_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_ton_resource ON public.tenant_operational_notifications (resource_id, occurred_at DESC) WHERE resource_id IS NOT NULL;

ALTER TABLE public.tenant_operational_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ton_select_member"
  ON public.tenant_operational_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_operational_notifications.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Per-Member Read State ───────────────────────────────────────────────────

CREATE TABLE public.tenant_operational_notification_reads (
  notification_id UUID NOT NULL REFERENCES public.tenant_operational_notifications(id) ON DELETE CASCADE,
  tenant_member_id UUID NOT NULL REFERENCES public.tenant_members(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (notification_id, tenant_member_id)
);

CREATE INDEX idx_tonr_member ON public.tenant_operational_notification_reads (tenant_member_id);

ALTER TABLE public.tenant_operational_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tonr_own_reads"
  ON public.tenant_operational_notification_reads FOR SELECT
  USING (
    tenant_member_id IN (
      SELECT id FROM public.tenant_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );
