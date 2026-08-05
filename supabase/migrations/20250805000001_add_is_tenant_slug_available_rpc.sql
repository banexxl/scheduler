-- Migration: Add is_tenant_slug_available RPC
-- Purpose: Safely checks whether a candidate tenant slug is available
-- without exposing tenant data through RLS.
--
-- Uses SECURITY DEFINER because ordinary users cannot read all tenant slugs
-- through RLS. The function only returns a boolean.

CREATE OR REPLACE FUNCTION public.is_tenant_slug_available(candidate_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized text;
BEGIN
  -- Normalize input
  normalized := lower(trim(COALESCE(candidate_slug, '')));

  -- Reject null or empty
  IF normalized = '' THEN
    RETURN false;
  END IF;

  -- Validate length (3–63 characters)
  IF length(normalized) < 3 OR length(normalized) > 63 THEN
    RETURN false;
  END IF;

  -- Validate format: starts with letter, ends with letter/digit,
  -- only lowercase letters, digits, and single hyphens between segments
  IF normalized !~ '^[a-z][a-z0-9-]*[a-z0-9]$' THEN
    RETURN false;
  END IF;

  -- Reject repeated hyphens
  IF normalized ~ '--' THEN
    RETURN false;
  END IF;

  -- Check if slug already exists in tenants table
  -- Any existing slug is unavailable regardless of tenant status
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE lower(t.slug) = normalized
  );
END;
$$;

-- Restrict access: only authenticated users can check availability
REVOKE ALL ON FUNCTION public.is_tenant_slug_available(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_tenant_slug_available(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_slug_available(text) TO authenticated;

COMMENT ON FUNCTION public.is_tenant_slug_available(text) IS
  'Checks whether a candidate tenant slug is available. Returns true only when the slug has valid format and does not exist in the tenants table. Uses SECURITY DEFINER to bypass RLS without exposing tenant data.';
