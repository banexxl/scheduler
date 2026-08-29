-- ============================================================
-- Migration: Drop custom portal auth tables
-- ============================================================
-- These tables are replaced by Supabase Auth's built-in
-- magic link (signInWithOtp). No custom token/session
-- management is needed.
-- ============================================================

DROP TABLE IF EXISTS public.customer_portal_sessions CASCADE;
DROP TABLE IF EXISTS public.customer_portal_access_tokens CASCADE;
