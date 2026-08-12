-- ============================================================
-- Migration: Sync Tenant Deletion / Last-Owner Protection
-- Milestone corrective migration
--
-- Purpose:
-- 1. Persist the scoped whole-tenant deletion bypass that was
--    previously applied manually.
-- 2. Keep strict last-owner protection for normal operations.
-- 3. Restrict permanent tenant deletion RPC to trusted
--    service-role usage only.
-- 4. Keep test deletion service-role only.
--
-- IMPORTANT:
-- Service-role bypasses RLS but DOES NOT bypass PostgreSQL
-- triggers. The transaction-local app.deleting_tenant setting
-- allows the last-owner trigger to distinguish intentional
-- whole-tenant deletion from normal membership removal.
-- ============================================================


-- ============================================================
-- 1. Last active owner protection
-- ============================================================

CREATE OR REPLACE FUNCTION private.prevent_last_tenant_owner_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    active_owner_count integer;
    deleting_tenant_id text;
BEGIN
    -- --------------------------------------------------------
    -- Controlled whole-tenant deletion bypass.
    --
    -- This is NOT a generic true/false bypass.
    -- It only permits the operation when the transaction-local
    -- tenant ID exactly matches the membership tenant ID.
    --
    -- Only trusted tenant deletion RPCs should ever set this.
    -- --------------------------------------------------------

    deleting_tenant_id :=
        current_setting('app.deleting_tenant', true);

    IF deleting_tenant_id IS NOT NULL
       AND deleting_tenant_id = OLD.tenant_id::text
    THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;

        RETURN NEW;
    END IF;


    -- --------------------------------------------------------
    -- Normal DELETE protection
    -- --------------------------------------------------------

    IF TG_OP = 'DELETE' THEN
        -- Non-owner or already non-active membership deletion
        -- does not affect the active-owner invariant.
        IF OLD.role <> 'owner'
           OR OLD.status <> 'active'
        THEN
            RETURN OLD;
        END IF;

        SELECT COUNT(*)
        INTO active_owner_count
        FROM public.tenant_members tm
        WHERE tm.tenant_id = OLD.tenant_id
          AND tm.role = 'owner'
          AND tm.status = 'active'
          AND tm.id <> OLD.id;

        IF active_owner_count = 0 THEN
            RAISE EXCEPTION
                'A tenant must have at least one active owner.';
        END IF;

        RETURN OLD;
    END IF;


    -- --------------------------------------------------------
    -- Normal UPDATE protection
    --
    -- Prevents:
    -- owner → admin/etc.
    -- active owner → suspended/etc.
    --
    -- when this is the tenant's final active owner.
    -- --------------------------------------------------------

    IF TG_OP = 'UPDATE'
       AND OLD.role = 'owner'
       AND OLD.status = 'active'
       AND (
            NEW.role <> 'owner'
            OR NEW.status <> 'active'
       )
    THEN
        SELECT COUNT(*)
        INTO active_owner_count
        FROM public.tenant_members tm
        WHERE tm.tenant_id = OLD.tenant_id
          AND tm.role = 'owner'
          AND tm.status = 'active'
          AND tm.id <> OLD.id;

        IF active_owner_count = 0 THEN
            RAISE EXCEPTION
                'A tenant must have at least one active owner.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;


COMMENT ON FUNCTION private.prevent_last_tenant_owner_removal()
IS
'Protects the final active tenant owner during normal membership mutations. '
'Trusted whole-tenant deletion may bypass the check only when the transaction-local '
'app.deleting_tenant value exactly matches the tenant being deleted.';


-- ============================================================
-- 2. Permanent tenant deletion RPC
-- ============================================================
--
-- IMPORTANT:
-- This function must NOT be callable directly by normal
-- authenticated clients after this migration.
--
-- Application flow:
--
-- authenticated user
--   → server action
--   → require tenant owner
--   → createServiceRoleClient()
--   → RPC delete_tenant_permanently(...)
--
-- RPC still performs its own ownership verification as
-- defense-in-depth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_tenant_permanently(
    p_tenant_id UUID,
    p_actor_user_id UUID,
    p_confirmation_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_tenant RECORD;
    v_actor_membership RECORD;

    v_summary JSONB;

    v_member_count INTEGER;
    v_appointment_count INTEGER;
    v_service_count INTEGER;
    v_location_count INTEGER;

    v_has_active_subscription BOOLEAN;
    v_has_pending_refunds BOOLEAN;
BEGIN
    -- --------------------------------------------------------
    -- 1. Lock/load tenant
    -- --------------------------------------------------------

    SELECT *
    INTO v_tenant
    FROM public.tenants
    WHERE id = p_tenant_id
    FOR UPDATE;

    IF v_tenant IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'not_found'
        );
    END IF;


    -- --------------------------------------------------------
    -- 2. Confirmation slug
    -- --------------------------------------------------------

    IF p_confirmation_slug IS NOT NULL
       AND p_confirmation_slug <> v_tenant.slug
    THEN
        RETURN jsonb_build_object(
            'status', 'confirmation_mismatch'
        );
    END IF;


    -- --------------------------------------------------------
    -- 3. Defense-in-depth owner verification
    -- --------------------------------------------------------

    SELECT *
    INTO v_actor_membership
    FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = p_actor_user_id
      AND role = 'owner'
      AND status = 'active'
    LIMIT 1;

    IF v_actor_membership IS NULL THEN
        RETURN jsonb_build_object(
            'status', 'unauthorized'
        );
    END IF;


    -- --------------------------------------------------------
    -- 4. Active SaaS subscription blocker
    -- --------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.tenant_subscriptions
        WHERE tenant_id = p_tenant_id
          AND status IN (
              'active',
              'trialing',
              'past_due'
          )
          AND access_state NOT IN (
              'revoked',
              'ending'
          )
    )
    INTO v_has_active_subscription;

    IF v_has_active_subscription THEN
        RETURN jsonb_build_object(
            'status', 'active_subscription',
            'message',
            'Cancel your subscription before deleting.'
        );
    END IF;


    -- --------------------------------------------------------
    -- 5. Pending financial operation blocker
    -- --------------------------------------------------------

    SELECT EXISTS (
        SELECT 1
        FROM public.appointment_payment_refunds
        WHERE tenant_id = p_tenant_id
          AND status IN (
              'pending',
              'processing'
          )
    )
    INTO v_has_pending_refunds;

    IF v_has_pending_refunds THEN
        RETURN jsonb_build_object(
            'status', 'pending_refunds',
            'message',
            'Resolve pending refunds before deleting.'
        );
    END IF;


    -- --------------------------------------------------------
    -- 6. Collect deletion summary
    -- --------------------------------------------------------

    SELECT COUNT(*)
    INTO v_member_count
    FROM public.tenant_members
    WHERE tenant_id = p_tenant_id;

    SELECT COUNT(*)
    INTO v_appointment_count
    FROM public.appointments
    WHERE tenant_id = p_tenant_id;

    SELECT COUNT(*)
    INTO v_service_count
    FROM public.services
    WHERE tenant_id = p_tenant_id;

    SELECT COUNT(*)
    INTO v_location_count
    FROM public.locations
    WHERE tenant_id = p_tenant_id;


    v_summary := jsonb_build_object(
        'members', v_member_count,
        'appointments', v_appointment_count,
        'services', v_service_count,
        'locations', v_location_count,
        'tenant_status', v_tenant.status
    );


    -- --------------------------------------------------------
    -- 7. Permanent deletion audit record
    --
    -- tenant_deletion_events intentionally has no FK to tenants
    -- so the record survives the tenant cascade.
    -- --------------------------------------------------------

    INSERT INTO public.tenant_deletion_events (
        tenant_id,
        tenant_name,
        tenant_slug,
        actor_user_id,
        summary
    )
    VALUES (
        p_tenant_id,
        v_tenant.name,
        v_tenant.slug,
        p_actor_user_id,
        v_summary
    );


    -- --------------------------------------------------------
    -- 8. Explicitly clean RESTRICT relationships
    -- --------------------------------------------------------

    DELETE FROM public.billing_checkout_sessions
    WHERE tenant_id = p_tenant_id;

    DELETE FROM public.tenant_billing_customers
    WHERE tenant_id = p_tenant_id;


    -- --------------------------------------------------------
    -- 9. Enable scoped last-owner bypass
    --
    -- true = transaction-local.
    --
    -- This disappears automatically when the transaction ends.
    -- Trigger verifies the tenant ID, so it cannot bypass another
    -- tenant's owner protection.
    -- --------------------------------------------------------

    PERFORM set_config(
        'app.deleting_tenant',
        p_tenant_id::text,
        true
    );


    -- --------------------------------------------------------
    -- 10. Remove memberships
    --
    -- Normally the last active owner trigger would block this.
    -- The scoped deletion context allows it only for this tenant.
    -- --------------------------------------------------------

    DELETE FROM public.tenant_members
    WHERE tenant_id = p_tenant_id;


    -- --------------------------------------------------------
    -- 11. Delete tenant
    --
    -- Existing ON DELETE CASCADE relationships remove remaining
    -- tenant-owned data according to the schema.
    -- --------------------------------------------------------

    DELETE FROM public.tenants
    WHERE id = p_tenant_id;


    RETURN jsonb_build_object(
        'status', 'deleted',
        'summary', v_summary
    );
END;
$function$;


COMMENT ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT)
IS
'Permanently deletes a tenant through a trusted service-role server path. '
'Normal membership last-owner protection remains enforced; this RPC sets a '
'transaction-local tenant-scoped deletion context before membership cleanup.';


-- ============================================================
-- 3. Restrict permanent tenant deletion RPC
-- ============================================================

REVOKE ALL
ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT)
FROM anon;

REVOKE ALL
ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT)
FROM authenticated;


-- service_role should be the only application role executing it.
GRANT EXECUTE
ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT)
TO service_role;


-- ============================================================
-- 4. Dev/Test tenant cleanup RPC
-- ============================================================
--
-- Service-role only.
--
-- Unlike production deletion:
-- - no owner validation
-- - no subscription blocker
-- - intended ONLY for disposable fixture tenants
--
-- Production guard remains mandatory in the Node/test script.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_tenant_for_test(
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.tenants
        WHERE id = p_tenant_id
    ) THEN
        RETURN jsonb_build_object(
            'status', 'not_found'
        );
    END IF;


    -- Explicit RESTRICT relationships.
    DELETE FROM public.billing_checkout_sessions
    WHERE tenant_id = p_tenant_id;

    DELETE FROM public.tenant_billing_customers
    WHERE tenant_id = p_tenant_id;


    -- Scoped transaction-local trigger bypass.
    PERFORM set_config(
        'app.deleting_tenant',
        p_tenant_id::text,
        true
    );


    DELETE FROM public.tenant_members
    WHERE tenant_id = p_tenant_id;


    DELETE FROM public.tenants
    WHERE id = p_tenant_id;


    RETURN jsonb_build_object(
        'status', 'deleted'
    );
END;
$function$;


COMMENT ON FUNCTION public.delete_tenant_for_test(UUID)
IS
'Dev/test-only tenant cleanup helper. Service-role only. '
'Uses the same tenant-scoped transaction-local owner-trigger bypass.';


REVOKE ALL
ON FUNCTION public.delete_tenant_for_test(UUID)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.delete_tenant_for_test(UUID)
FROM anon;

REVOKE ALL
ON FUNCTION public.delete_tenant_for_test(UUID)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.delete_tenant_for_test(UUID)
TO service_role;


-- ============================================================
-- 5. Protect trigger/function privileges
-- ============================================================
--
-- Normal application users do not need to execute trigger
-- functions directly.
-- ============================================================

REVOKE ALL
ON FUNCTION private.prevent_last_tenant_owner_removal()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION private.prevent_last_tenant_owner_removal()
FROM anon;

REVOKE ALL
ON FUNCTION private.prevent_last_tenant_owner_removal()
FROM authenticated;


-- ============================================================
-- 6. Verification comments
-- ============================================================
--
-- Expected behavior after this migration:
--
-- A) Single owner:
--
-- DELETE tenant_members(owner)
-- → ERROR: A tenant must have at least one active owner.
--
-- B) Single owner:
--
-- UPDATE owner SET role = 'admin'
-- → ERROR
--
-- C) Single owner:
--
-- UPDATE owner SET status = 'suspended'
-- → ERROR
--
-- D) Two active owners:
--
-- Remove one owner
-- → allowed
--
-- E) Normal authenticated client:
--
-- RPC delete_tenant_permanently(...)
-- → permission denied
--
-- F) Trusted server/service-role:
--
-- RPC delete_tenant_permanently(...)
-- → validates owner
-- → validates blockers
-- → sets app.deleting_tenant=<tenant UUID>
-- → memberships removed
-- → tenant deleted
--
-- G) Deleting Tenant A:
--
-- app.deleting_tenant=A
-- → trigger bypasses A only
-- → Tenant B last-owner protection remains active
--
-- H) auth.users:
--
-- This RPC does NOT delete auth.users.
--
-- ============================================================