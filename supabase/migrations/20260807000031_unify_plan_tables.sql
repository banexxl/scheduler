-- Migration: Unify plan tables — consolidate subscription_plans into billing_plans.
--
-- billing_plans is the canonical plan table (Polar-integrated, admin UI, prices).
-- subscription_plans was an older, simpler table that is no longer needed.
--
-- This migration:
-- 1. Migrates any existing plan_id references in tenant_subscriptions to billing_plan_id
-- 2. Drops the FK from tenant_subscriptions.plan_id → subscription_plans
-- 3. Updates the create_tenant RPC to validate against billing_plans
-- 4. Drops the subscription_plans table

-- ============================================================
-- STEP 1: Migrate existing plan_id data to billing_plan_id
-- ============================================================

-- For any tenant_subscriptions rows that have plan_id set but billing_plan_id NULL,
-- try to match by name or code to billing_plans.plan_key.
UPDATE public.tenant_subscriptions ts
SET billing_plan_id = bp.id
FROM public.subscription_plans sp
JOIN public.billing_plans bp
  ON lower(bp.plan_key) = lower(sp.code)
WHERE ts.plan_id = sp.id
  AND ts.billing_plan_id IS NULL;

-- ============================================================
-- STEP 2: Drop FK and plan_id column
-- ============================================================

ALTER TABLE public.tenant_subscriptions
  DROP CONSTRAINT IF EXISTS tenant_subscriptions_plan_id_fkey;

-- Keep plan_id column for now (nullable, no FK) to avoid breaking running code
-- during deployment. It will be unused going forward.

-- ============================================================
-- STEP 3: Replace create_tenant RPC
-- ============================================================

DROP FUNCTION IF EXISTS public.create_tenant(text,text,text,text,text,text,uuid,integer);

CREATE OR REPLACE FUNCTION public.create_tenant(
  tenant_name text,
  tenant_slug text,
  primary_location_name text DEFAULT 'Main Location',
  primary_location_slug text DEFAULT 'main',
  timezone_name text DEFAULT 'UTC',
  currency_code text DEFAULT 'USD',
  subscription_plan_id uuid DEFAULT NULL,
  trial_days integer DEFAULT 0
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_user_id uuid;
    new_tenant_id uuid;
    new_location_id uuid;

    normalized_tenant_name text;
    normalized_tenant_slug text;

    normalized_location_name text;
    normalized_location_slug text;

    normalized_timezone text;
    normalized_currency text;
BEGIN
    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    normalized_tenant_name := trim(tenant_name);
    normalized_tenant_slug := lower(trim(tenant_slug));

    normalized_location_name := trim(primary_location_name);
    normalized_location_slug := lower(trim(primary_location_slug));

    normalized_timezone := trim(timezone_name);
    normalized_currency := upper(trim(currency_code));

    IF char_length(normalized_tenant_name) < 2 THEN
        RAISE EXCEPTION 'Tenant name must contain at least 2 characters.';
    END IF;

    IF normalized_tenant_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION 'Tenant slug may contain lowercase letters, numbers and hyphens only.';
    END IF;

    IF char_length(normalized_tenant_slug) NOT BETWEEN 3 AND 63 THEN
        RAISE EXCEPTION 'Tenant slug must contain between 3 and 63 characters.';
    END IF;

    IF char_length(normalized_location_name) < 2 THEN
        RAISE EXCEPTION 'Location name must contain at least 2 characters.';
    END IF;

    IF normalized_location_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION 'Location slug may contain lowercase letters, numbers and hyphens only.';
    END IF;

    IF normalized_currency !~ '^[A-Z]{3}$' THEN
        RAISE EXCEPTION 'Currency must be a three-letter ISO currency code.';
    END IF;

    IF trial_days < 0 OR trial_days > 365 THEN
        RAISE EXCEPTION 'Trial duration must be between 0 and 365 days.';
    END IF;

    -- Validate plan against billing_plans (the unified plan table)
    IF subscription_plan_id IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM public.billing_plans bp
            WHERE bp.id = subscription_plan_id
              AND bp.is_active = true
       )
    THEN
        RAISE EXCEPTION 'The selected subscription plan does not exist or is inactive.';
    END IF;

    -- Create tenant
    INSERT INTO public.tenants (
        name,
        slug,
        status,
        default_timezone,
        default_currency,
        created_by
    )
    VALUES (
        normalized_tenant_name,
        normalized_tenant_slug,
        CASE
            WHEN trial_days > 0 THEN 'trialing'
            ELSE 'active'
        END,
        normalized_timezone,
        normalized_currency,
        current_user_id
    )
    RETURNING id INTO new_tenant_id;

    -- Create owner membership
    INSERT INTO public.tenant_members (
        tenant_id,
        user_id,
        role,
        status
    )
    VALUES (
        new_tenant_id,
        current_user_id,
        'owner',
        'active'
    );

    -- Create primary location
    INSERT INTO public.locations (
        tenant_id,
        name,
        slug,
        location_type,
        timezone,
        is_primary,
        is_active
    )
    VALUES (
        new_tenant_id,
        normalized_location_name,
        normalized_location_slug,
        'physical',
        normalized_timezone,
        true,
        true
    )
    RETURNING id INTO new_location_id;

    -- Create subscription (references billing_plans via billing_plan_id)
    INSERT INTO public.tenant_subscriptions (
        tenant_id,
        billing_plan_id,
        status,
        trial_started_at,
        trial_ends_at,
        current_period_started_at,
        current_period_ends_at
    )
    VALUES (
        new_tenant_id,
        subscription_plan_id,
        CASE
            WHEN trial_days > 0 THEN 'trialing'
            ELSE 'active'
        END,
        CASE
            WHEN trial_days > 0 THEN now()
            ELSE NULL
        END,
        CASE
            WHEN trial_days > 0
                THEN now() + make_interval(days => trial_days)
            ELSE NULL
        END,
        CASE
            WHEN trial_days = 0 THEN now()
            ELSE NULL
        END,
        NULL
    );

    -- Audit log
    INSERT INTO public.audit_logs (
        tenant_id,
        actor_user_id,
        actor_type,
        action,
        entity_type,
        entity_id,
        new_data
    )
    VALUES (
        new_tenant_id,
        current_user_id,
        'user',
        'tenant.created',
        'tenant',
        new_tenant_id::text,
        jsonb_build_object(
            'name', normalized_tenant_name,
            'slug', normalized_tenant_slug,
            'primary_location_id', new_location_id
        )
    );

    RETURN new_tenant_id;
END;
$$;

-- ============================================================
-- STEP 4: Drop subscription_plans table
-- ============================================================

DROP TABLE IF EXISTS public.subscription_plans CASCADE;
