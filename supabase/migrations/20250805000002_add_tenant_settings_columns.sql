-- Migration: Add business settings columns to tenants
-- Adds: description, website_url, default_language, social_links

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS default_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Constraints

-- description: max 2000 characters
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_description_length_check
  CHECK (description IS NULL OR char_length(description) <= 2000);

-- website_url: must be non-empty when set
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_website_url_nonempty_check
  CHECK (website_url IS NULL OR trim(website_url) <> '');

-- default_language: must be one of supported values
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_default_language_check
  CHECK (default_language IN ('en', 'sr', 'ro'));

-- social_links: must be a JSON object (not array or scalar)
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_social_links_object_check
  CHECK (jsonb_typeof(social_links) = 'object');

COMMENT ON COLUMN public.tenants.description IS 'Optional business description, max 2000 characters';
COMMENT ON COLUMN public.tenants.website_url IS 'Optional business website URL (absolute HTTP/HTTPS)';
COMMENT ON COLUMN public.tenants.default_language IS 'Default public-site language (en, sr, ro)';
COMMENT ON COLUMN public.tenants.social_links IS 'Social media URLs as JSON object: { facebook, instagram, linkedin, tiktok, youtube }';
