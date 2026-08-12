-- Migration: Sync Tenant Lifecycle Safety — Milestone 15.3 Part A
--
-- Captures all manually-applied tenant-deletion and membership-safety fixes
-- into authoritative migration history.
--
-- Changes persisted:
-- 1. prevent_last_tenant_owner_removal trigger function with app.deleting_tenant bypass
-- 2. safe_remove_tenant_member using 'suspended' status (not 'inactive')
-- 3. delete_tenant_permanently RPC with set_config bypass
-- 4. delete_tenant_for_test RPC with set_config bypass
-- 5. RPC permission: delete_tenant_permanently restricted to service_role only

-- ============================================================
-- 1. Last-Owner Trigger Function (with tenant-specific deletion bypass)
-- ============================================================

CREATE OR REPLACE FUNCTION private.prevent_last_tenant_owner_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    active_owner_count INTEGER;
    deleting_tenant_id TEXT;
BEGIN
    -- Allow bypass during authorized whole-tenant deletion ONLY.
    -- The setting is transaction-local and tenant-specific.
    deleting_tenant_id := current_setting('app.deleting_tenant', true);
    IF deleting_tenant_id IS NOT NULL AND deleting_tenant_id = OLD.tenant_id::text THEN
        IF tg_op = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF tg_op = 'DELETE' THEN
        IF OLD.role <> 'owner' OR OLD.status <> 'active' THEN
            RETURN OLD;
        END IF;

        SELECT count(*)
        INTO active_owner_count
        FROM public.tenant_members tm
        WHERE tm.tenant_id = OLD.tenant_id
          AND tm.role = 'owner'
          AND tm.status = 'active'
          AND tm.id <> OLD.id;

        IF active_owner_count = 0 THEN
            RAISE EXCEPTION 'A tenant must have at least one active owner.';
        END IF;

        RETURN OLD;
    END IF;

    IF tg_op = 'UPDATE'
       AND OLD.role = 'owner'
       AND OLD.status = 'active'
       AND (
            NEW.role <> 'owner'
            OR NEW.status <> 'active'
       )
    THEN
        SELECT count(*)
        INTO active_owner_count
        FROM public.tenant_members tm
        WHERE tm.tenant_id = OLD.tenant_id
          AND tm.role = 'owner'
          AND tm.status = 'active'
          AND tm.id <> OLD.id;

        IF active_owner_count = 0 THEN
            RAISE EXCEPTION 'A tenant must have at least one active owner.';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Ensure trigger exists (do not duplicate)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tenant_members_prevent_last_owner'
      AND tgrelid = 'public.tenant_members'::regclass
  ) THEN
    CREATE TRIGGER tenant_members_prevent_last_owner
      BEFORE DELETE OR UPDATE ON public.tenant_members
      FOR EACH ROW
      EXECUTE FUNCTION private.prevent_last_tenant_owner_removal();
  END IF;
END
$$;

-- ============================================================
-- 2. safe_remove_tenant_member (uses 'suspended', not 'inactive')
-- ============================================================

CREATE OR REPLACE FUNCTION public.safe_remove_tenant_member(
  p_tenant_id UUID,
  p_membership_id UUID,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target RECORD;
  v_actor RECORD;
  v_owner_count INTEGER;
BEGIN
  -- Lock target
  SELECT * INTO v_target
  FROM tenant_members
  WHERE id = p_membership_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_target IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Verify actor
  SELECT * INTO v_actor
  FROM tenant_members
  WHERE tenant_id = p_tenant_id AND user_id = p_actor_user_id AND status = 'active';

  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  -- Only owner/admin can remove
  IF v_actor.role NOT IN ('owner', 'admin') THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  -- Admin cannot remove owner
  IF v_actor.role = 'admin' AND v_target.role = 'owner' THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  -- Last owner protection
  IF v_target.role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM tenant_members
    WHERE tenant_id = p_tenant_id AND role = 'owner' AND status = 'active';

    IF v_owner_count <= 1 THEN
      RETURN jsonb_build_object('status', 'last_owner');
    END IF;
  END IF;

  -- Deactivate using 'suspended' (valid status per CHECK constraint)
  UPDATE tenant_members
  SET status = 'suspended'
  WHERE id = p_membership_id;

  RETURN jsonb_build_object('status', 'removed', 'membership_id', p_membership_id::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_remove_tenant_member TO authenticated;

-- ============================================================
-- 3. delete_tenant_permanently (with transaction-local bypass)
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
AS $$
DECLARE
  v_tenant RECORD;
  v_actor_membership RECORD;
  v_summary JSONB;
  v_member_count INTEGER;
  v_appointment_count INTEGER;
  v_service_count INTEGER;
  v_location_count INTEGER;
  v_has_active_subscription BOOLEAN;
BEGIN
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id FOR UPDATE;
  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF p_confirmation_slug IS NOT NULL AND p_confirmation_slug != v_tenant.slug THEN
    RETURN jsonb_build_object('status', 'confirmation_mismatch');
  END IF;

  SELECT * INTO v_actor_membership
  FROM tenant_members
  WHERE tenant_id = p_tenant_id AND user_id = p_actor_user_id AND status = 'active' AND role = 'owner';

  IF v_actor_membership IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthorized');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM tenant_subscriptions
    WHERE tenant_id = p_tenant_id AND status IN ('active', 'trialing', 'past_due') AND access_state NOT IN ('revoked', 'ending')
  ) INTO v_has_active_subscription;

  IF v_has_active_subscription THEN
    RETURN jsonb_build_object('status', 'active_subscription', 'message', 'Cancel your subscription before deleting.');
  END IF;

  SELECT COUNT(*) INTO v_member_count FROM tenant_members WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_appointment_count FROM appointments WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_service_count FROM services WHERE tenant_id = p_tenant_id;
  SELECT COUNT(*) INTO v_location_count FROM locations WHERE tenant_id = p_tenant_id;

  v_summary := jsonb_build_object(
    'members', v_member_count,
    'appointments', v_appointment_count,
    'services', v_service_count,
    'locations', v_location_count,
    'tenant_status', v_tenant.status
  );

  INSERT INTO tenant_deletion_events (tenant_id, tenant_name, tenant_slug, actor_user_id, summary)
  VALUES (p_tenant_id, v_tenant.name, v_tenant.slug, p_actor_user_id, v_summary);

  DELETE FROM billing_checkout_sessions WHERE tenant_id = p_tenant_id;
  DELETE FROM tenant_billing_customers WHERE tenant_id = p_tenant_id;

  -- Transaction-local bypass for last-owner trigger (tenant-specific)
  PERFORM set_config('app.deleting_tenant', p_tenant_id::text, true);

  DELETE FROM tenant_members WHERE tenant_id = p_tenant_id;
  DELETE FROM tenants WHERE id = p_tenant_id;

  RETURN jsonb_build_object('status', 'deleted', 'summary', v_summary);
END;
$$;

-- Restrict to service_role only (not directly callable by authenticated/anon)
REVOKE ALL ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.delete_tenant_permanently(UUID, UUID, TEXT) FROM authenticated;

-- ============================================================
-- 4. delete_tenant_for_test (service-role only, skips subscription check)
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_tenant_for_test(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM billing_checkout_sessions WHERE tenant_id = p_tenant_id;
  DELETE FROM tenant_billing_customers WHERE tenant_id = p_tenant_id;

  -- Transaction-local bypass for last-owner trigger (tenant-specific)
  PERFORM set_config('app.deleting_tenant', p_tenant_id::text, true);

  DELETE FROM tenant_members WHERE tenant_id = p_tenant_id;
  DELETE FROM tenants WHERE id = p_tenant_id;

  RETURN jsonb_build_object('status', 'deleted');
END;
$$;

-- Service-role only
REVOKE ALL ON FUNCTION public.delete_tenant_for_test(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_tenant_for_test(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.delete_tenant_for_test(UUID) FROM authenticated;
