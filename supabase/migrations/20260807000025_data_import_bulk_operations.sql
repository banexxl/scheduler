-- Migration: Data Import & Bulk Operations (Milestone 15.10)
-- ====================================================================
-- Creates:
-- 1. data_import_jobs table
-- 2. data_import_rows table
-- 3. Processor RPCs (claim batch, complete job)

-- ============================================================
-- PART A: Import Jobs
-- ============================================================

CREATE TABLE public.data_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  original_filename TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  valid_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  created_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.data_import_jobs IS
  'Tenant-scoped import jobs for CSV data import. Milestone 15.10.';

ALTER TABLE public.data_import_jobs
  ADD CONSTRAINT dij_import_type_check CHECK (
    import_type IN ('customers', 'services', 'staff_resources')
  ),
  ADD CONSTRAINT dij_status_check CHECK (
    status IN ('uploaded', 'mapping', 'validated', 'ready', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled')
  ),
  ADD CONSTRAINT dij_filename_length CHECK (char_length(original_filename) BETWEEN 1 AND 500),
  ADD CONSTRAINT dij_file_size_limit CHECK (file_size_bytes >= 0 AND file_size_bytes <= 10485760),
  ADD CONSTRAINT dij_row_counts_non_negative CHECK (
    total_rows >= 0 AND valid_rows >= 0 AND invalid_rows >= 0
    AND created_rows >= 0 AND updated_rows >= 0 AND skipped_rows >= 0 AND failed_rows >= 0
  );

CREATE INDEX idx_dij_tenant_created ON public.data_import_jobs (tenant_id, created_at DESC);
CREATE INDEX idx_dij_tenant_status ON public.data_import_jobs (tenant_id, status);

CREATE TRIGGER trg_dij_updated_at
  BEFORE UPDATE ON public.data_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.data_import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dij_select_member"
  ON public.data_import_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = data_import_jobs.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

CREATE POLICY "dij_insert_owner_admin_manager"
  ON public.data_import_jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = data_import_jobs.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "dij_update_owner_admin_manager"
  ON public.data_import_jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = data_import_jobs.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

-- ============================================================
-- PART B: Import Rows
-- ============================================================

CREATE TABLE public.data_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  import_job_id UUID NOT NULL REFERENCES public.data_import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_codes JSONB NULL,
  error_details JSONB NULL,
  matched_entity_id UUID NULL,
  result_entity_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.data_import_rows IS
  'Per-row import state and results. Milestone 15.10.';

ALTER TABLE public.data_import_rows
  ADD CONSTRAINT dir_status_check CHECK (
    status IN ('pending', 'valid', 'invalid', 'skipped', 'created', 'updated', 'failed')
  ),
  ADD CONSTRAINT dir_row_number_positive CHECK (row_number > 0);

CREATE UNIQUE INDEX idx_dir_job_row ON public.data_import_rows (import_job_id, row_number);
CREATE INDEX idx_dir_job_status ON public.data_import_rows (import_job_id, status);
CREATE INDEX idx_dir_tenant ON public.data_import_rows (tenant_id);

CREATE TRIGGER trg_dir_updated_at
  BEFORE UPDATE ON public.data_import_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.data_import_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dir_select_member"
  ON public.data_import_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = data_import_rows.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- No direct INSERT/UPDATE/DELETE from client — managed via service role during processing

-- ============================================================
-- PART C: Processor RPCs
-- ============================================================

-- Claim a batch of pending/valid rows for processing.
CREATE OR REPLACE FUNCTION claim_import_rows_batch(
  p_job_id UUID,
  p_batch_size INTEGER DEFAULT 100
)
RETURNS TABLE(row_id UUID, row_number INTEGER, normalized_data JSONB, matched_entity_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE data_import_rows
    SET status = 'pending', -- Keep pending during processing
        updated_at = NOW()
    WHERE id IN (
      SELECT dir.id
      FROM data_import_rows dir
      WHERE dir.import_job_id = p_job_id
        AND dir.status = 'valid'
      ORDER BY dir.row_number ASC
      LIMIT p_batch_size
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, data_import_rows.row_number, data_import_rows.normalized_data, data_import_rows.matched_entity_id
  )
  SELECT claimed.id AS row_id,
         claimed.row_number,
         claimed.normalized_data,
         claimed.matched_entity_id
  FROM claimed;
END;
$$;

REVOKE ALL ON FUNCTION claim_import_rows_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_import_rows_batch TO service_role;

-- Finalize import job (calculate final counters from row statuses).
CREATE OR REPLACE FUNCTION finalize_import_job(
  p_job_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created INT;
  v_updated INT;
  v_skipped INT;
  v_failed INT;
  v_total_valid INT;
  v_total_invalid INT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'created'),
    COUNT(*) FILTER (WHERE status = 'updated'),
    COUNT(*) FILTER (WHERE status = 'skipped'),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*) FILTER (WHERE status IN ('created', 'updated', 'skipped', 'valid')),
    COUNT(*) FILTER (WHERE status = 'invalid')
  INTO v_created, v_updated, v_skipped, v_failed, v_total_valid, v_total_invalid
  FROM data_import_rows
  WHERE import_job_id = p_job_id;

  UPDATE data_import_jobs
  SET created_rows = v_created,
      updated_rows = v_updated,
      skipped_rows = v_skipped,
      failed_rows = v_failed,
      valid_rows = v_total_valid,
      invalid_rows = v_total_invalid,
      status = CASE
        WHEN v_failed > 0 THEN 'completed_with_errors'
        ELSE 'completed'
      END,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_job_id
    AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION finalize_import_job FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_import_job TO service_role;
