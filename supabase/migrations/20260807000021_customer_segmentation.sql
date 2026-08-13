-- Migration: Customer Segmentation — Milestone 15.6

-- ============================================================
-- 1. Customer Segments Table
-- ============================================================

CREATE TABLE public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT NULL,

  segment_type TEXT NOT NULL DEFAULT 'custom',
  rules JSONB NOT NULL DEFAULT '{"operator":"and","rules":[]}'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cs_type_check CHECK (segment_type IN ('system', 'custom')),
  CONSTRAINT cs_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT cs_description_len CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT cs_rules_object CHECK (jsonb_typeof(rules) = 'object')
);

COMMENT ON TABLE public.customer_segments IS
  'Tenant-scoped customer segments with rule-based dynamic membership. Milestone 15.6.';

CREATE INDEX idx_cs_tenant ON public.customer_segments (tenant_id, is_active, created_at DESC);

CREATE TRIGGER trg_cs_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_select_member" ON public.customer_segments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_segments.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active'));

CREATE POLICY "cs_insert_owner_admin" ON public.customer_segments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_segments.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "cs_update_owner_admin" ON public.customer_segments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_segments.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));

CREATE POLICY "cs_delete_owner_admin" ON public.customer_segments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = customer_segments.tenant_id AND tm.user_id = auth.uid() AND tm.status = 'active' AND tm.role IN ('owner', 'admin')));
