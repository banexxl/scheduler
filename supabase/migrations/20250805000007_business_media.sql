-- Migration: Business Media Foundation
-- Creates media_assets table, storage bucket config, RLS, storage policies, reorder RPC.

-- ============================================================
-- 1. Storage Bucket
-- Note: Supabase bucket creation via SQL is limited.
-- The developer must also configure in the Supabase Dashboard:
--   Bucket: business-media
--   Public: true (for reads)
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-media',
  'business-media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- 2. Storage RLS Policies
-- ============================================================

-- Public read for business-media bucket
CREATE POLICY "business_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-media');

-- Insert: authenticated owner/admin, path must start with their tenant ID
CREATE POLICY "business_media_insert_owner_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-media'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = (string_to_array(name, '/'))[1]::uuid
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Update: authenticated owner/admin for matching tenant path
CREATE POLICY "business_media_update_owner_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-media'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = (string_to_array(name, '/'))[1]::uuid
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Delete: authenticated owner/admin for matching tenant path
CREATE POLICY "business_media_delete_owner_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-media'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = (string_to_array(name, '/'))[1]::uuid
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 3. media_assets table
-- ============================================================

CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  resource_id uuid NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  media_role text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'business-media',
  storage_path text NOT NULL,
  original_filename text NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  width integer NULL,
  height integer NULL,
  alt_text text NULL,
  caption text NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);

-- Constraints
ALTER TABLE public.media_assets
  ADD CONSTRAINT ma_ownership_check CHECK (
    NOT (location_id IS NOT NULL AND resource_id IS NOT NULL)
  ),
  ADD CONSTRAINT ma_media_role_check CHECK (
    media_role IN ('logo', 'cover', 'gallery', 'profile')
  ),
  ADD CONSTRAINT ma_mime_type_check CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  ADD CONSTRAINT ma_size_check CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  ADD CONSTRAINT ma_alt_text_max CHECK (alt_text IS NULL OR char_length(alt_text) <= 250),
  ADD CONSTRAINT ma_caption_max CHECK (caption IS NULL OR char_length(caption) <= 500),
  ADD CONSTRAINT ma_original_filename_max CHECK (original_filename IS NULL OR char_length(original_filename) <= 255);

-- Business logo: one per tenant
CREATE UNIQUE INDEX idx_media_business_logo
  ON public.media_assets (tenant_id)
  WHERE location_id IS NULL AND resource_id IS NULL AND media_role = 'logo';

-- Business cover: one per tenant
CREATE UNIQUE INDEX idx_media_business_cover
  ON public.media_assets (tenant_id)
  WHERE location_id IS NULL AND resource_id IS NULL AND media_role = 'cover';

-- Location primary cover: one per location
CREATE UNIQUE INDEX idx_media_location_cover
  ON public.media_assets (location_id)
  WHERE media_role = 'cover' AND is_primary = true;

-- Resource primary profile: one per resource
CREATE UNIQUE INDEX idx_media_resource_profile
  ON public.media_assets (resource_id)
  WHERE media_role = 'profile' AND is_primary = true;

-- Updated-at trigger
CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.media_assets IS 'Media metadata for business, location, and resource images.';

-- ============================================================
-- 4. Media RLS
-- ============================================================

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- SELECT: active tenant members
CREATE POLICY "ma_select_member"
  ON public.media_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = media_assets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- INSERT: owner/admin
CREATE POLICY "ma_insert_owner_admin"
  ON public.media_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = media_assets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- UPDATE: owner/admin
CREATE POLICY "ma_update_owner_admin"
  ON public.media_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = media_assets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- DELETE: owner/admin
CREATE POLICY "ma_delete_owner_admin"
  ON public.media_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = media_assets.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 5. Reorder RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.reorder_media_assets(
  target_tenant_id uuid,
  ordered_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  i integer;
  asset_id uuid;
  asset_tenant uuid;
  first_location uuid;
  first_resource uuid;
  first_role text;
  check_location uuid;
  check_resource uuid;
  check_role text;
BEGIN
  -- Verify owner/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = target_tenant_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
      AND tm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires owner or admin role';
  END IF;

  IF array_length(ordered_ids, 1) IS NULL OR array_length(ordered_ids, 1) = 0 THEN
    RETURN true;
  END IF;

  -- Verify all IDs belong to the tenant and same collection
  SELECT ma.tenant_id, ma.location_id, ma.resource_id, ma.media_role
  INTO asset_tenant, first_location, first_resource, first_role
  FROM public.media_assets ma
  WHERE ma.id = ordered_ids[1];

  IF asset_tenant IS NULL OR asset_tenant != target_tenant_id THEN
    RAISE EXCEPTION 'Asset not found or does not belong to this business';
  END IF;

  FOR i IN 1..array_length(ordered_ids, 1) LOOP
    asset_id := ordered_ids[i];

    SELECT ma.tenant_id, ma.location_id, ma.resource_id, ma.media_role
    INTO asset_tenant, check_location, check_resource, check_role
    FROM public.media_assets ma
    WHERE ma.id = asset_id;

    IF asset_tenant IS NULL OR asset_tenant != target_tenant_id THEN
      RAISE EXCEPTION 'Asset % not found or cross-tenant', asset_id;
    END IF;

    IF check_role != first_role
       OR (check_location IS DISTINCT FROM first_location)
       OR (check_resource IS DISTINCT FROM first_resource) THEN
      RAISE EXCEPTION 'All assets must belong to the same collection';
    END IF;

    UPDATE public.media_assets SET sort_order = i WHERE id = asset_id;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_media_assets(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_media_assets(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_media_assets(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.reorder_media_assets(uuid, uuid[]) IS
  'Atomically reorders media assets within a collection. Verifies all assets belong to the same tenant and target.';
