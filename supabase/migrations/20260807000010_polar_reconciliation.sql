-- Milestone 11.9 — Polar Reconciliation & Recovery
-- ==================================================

-- ─── Reconciliation Run Audit ────────────────────────────────────────────────

CREATE TABLE public.payment_provider_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'polar',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  records_checked INTEGER NOT NULL DEFAULT 0,
  records_repaired INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  records_flagged INTEGER NOT NULL DEFAULT 0,
  trigger_type TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'running',
  request_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_provider_reconciliation_runs
  ADD CONSTRAINT pprr_status_check CHECK (
    status IN ('running', 'completed', 'failed')
  ),
  ADD CONSTRAINT pprr_trigger_check CHECK (
    trigger_type IN ('scheduled', 'manual', 'webhook_retry')
  );

CREATE INDEX idx_pprr_status ON public.payment_provider_reconciliation_runs (status, started_at DESC);

-- ─── Reconciliation Fields on Existing Tables ────────────────────────────────

ALTER TABLE public.appointment_payments
  ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.package_purchases
  ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.appointment_payment_refunds
  ADD COLUMN IF NOT EXISTS last_reconciled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS reconciliation_attempts INTEGER NOT NULL DEFAULT 0;

-- ─── Stale Payment Intent Candidates Index ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pi_stale_creating
  ON public.payment_intents (status, created_at)
  WHERE status = 'creating';

CREATE INDEX IF NOT EXISTS idx_pi_stale_open
  ON public.payment_intents (status, created_at)
  WHERE status = 'open';

-- ─── Unfulfilled Paid Package Index ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pp_paid_unfulfilled
  ON public.package_purchases (status, paid_at)
  WHERE status = 'paid' AND fulfilled_at IS NULL;

-- ─── Pending Refund Index ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_apr_stale_pending
  ON public.appointment_payment_refunds (status, created_at)
  WHERE status = 'pending';

-- RLS (admin only for reconciliation runs)
ALTER TABLE public.payment_provider_reconciliation_runs ENABLE ROW LEVEL SECURITY;
