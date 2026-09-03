-- Native Supabase Invite Acceptance
-- ==================================
-- Replaces the custom `tenant_member_invitations` token table + the
-- `accept_tenant_member_invitation` RPC. Team invitations now use Supabase
-- Auth's native invite (auth.admin.inviteUserByEmail). The invited role is
-- carried in the auth user's app_metadata.pending_tenant_invite and applied
-- by the custom /api/auth/accept-invite redirect route via this RPC.

-- ─── Accept Pending Invite RPC (Atomic) ──────────────────────────────────────
-- Creates (or reactivates) a tenant_members row with the invited role.
-- Idempotent: if an active membership already exists it is returned as-is.

CREATE OR REPLACE FUNCTION accept_pending_tenant_invite(
  p_user_id UUID,
  p_tenant_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_membership_id UUID;
  v_slug TEXT;
BEGIN
  IF p_role NOT IN ('owner', 'admin', 'manager', 'staff') THEN
    RETURN jsonb_build_object('status', 'invalid_role');
  END IF;

  -- Tenant must exist
  SELECT slug INTO v_slug FROM tenants WHERE id = p_tenant_id;
  IF v_slug IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid_tenant');
  END IF;

  -- Lock any existing membership row for this user+tenant
  SELECT * INTO v_existing
  FROM tenant_members
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'active' THEN
      RETURN jsonb_build_object(
        'status', 'already_member',
        'membership_id', v_existing.id::TEXT,
        'tenant_id', p_tenant_id::TEXT,
        'tenant_slug', v_slug,
        'role', v_existing.role
      );
    END IF;

    -- Reactivate a previously removed member with the invited role
    UPDATE tenant_members
    SET status = 'active', role = p_role
    WHERE id = v_existing.id;

    RETURN jsonb_build_object(
      'status', 'accepted',
      'membership_id', v_existing.id::TEXT,
      'tenant_id', p_tenant_id::TEXT,
      'tenant_slug', v_slug,
      'role', p_role
    );
  END IF;

  -- Create fresh membership with the invited role
  INSERT INTO tenant_members (tenant_id, user_id, role, status)
  VALUES (p_tenant_id, p_user_id, p_role, 'active')
  RETURNING id INTO v_membership_id;

  RETURN jsonb_build_object(
    'status', 'accepted',
    'membership_id', v_membership_id::TEXT,
    'tenant_id', p_tenant_id::TEXT,
    'tenant_slug', v_slug,
    'role', p_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_pending_tenant_invite TO authenticated, service_role;

-- ─── Drop the legacy custom-token invitation system ──────────────────────────

DROP FUNCTION IF EXISTS accept_tenant_member_invitation(TEXT, UUID, TEXT);
DROP TABLE IF EXISTS public.tenant_member_invitations CASCADE;
