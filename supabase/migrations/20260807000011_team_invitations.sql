-- Milestone 12.1 — Team Management & Staff Invitations
-- ======================================================

-- ─── Tenant Member Invitations ───────────────────────────────────────────────

CREATE TABLE public.tenant_member_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  email TEXT NOT NULL,
  role TEXT NOT NULL,

  token_hash TEXT NOT NULL,
  token_prefix TEXT NULL,

  status TEXT NOT NULL DEFAULT 'pending',

  invited_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_member_invitations IS
  'Team member invitations. Token stored as SHA-256 hash only. Milestone 12.1.';

ALTER TABLE public.tenant_member_invitations
  ADD CONSTRAINT tmi_role_check CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
  ADD CONSTRAINT tmi_status_check CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  ADD CONSTRAINT tmi_email_format CHECK (email ~* '^.+@.+\..+$'),
  ADD CONSTRAINT tmi_accepted_requires_at CHECK (status != 'accepted' OR accepted_at IS NOT NULL),
  ADD CONSTRAINT tmi_revoked_requires_at CHECK (status != 'revoked' OR revoked_at IS NOT NULL);

-- Only one active (pending) invitation per tenant+email
CREATE UNIQUE INDEX idx_tmi_active_invitation
  ON public.tenant_member_invitations (tenant_id, lower(trim(email)))
  WHERE status = 'pending';

CREATE INDEX idx_tmi_token_hash ON public.tenant_member_invitations (token_hash);
CREATE INDEX idx_tmi_tenant ON public.tenant_member_invitations (tenant_id, status, created_at DESC);

CREATE TRIGGER trg_tmi_updated_at
  BEFORE UPDATE ON public.tenant_member_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.tenant_member_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tmi_select_member"
  ON public.tenant_member_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = tenant_member_invitations.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- ─── Accept Invitation RPC (Atomic) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION accept_tenant_member_invitation(
  p_token_hash TEXT,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_existing_member RECORD;
  v_membership_id UUID;
BEGIN
  -- Lock invitation by token hash
  SELECT * INTO v_invitation
  FROM tenant_member_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  IF v_invitation.status != 'pending' THEN
    RETURN jsonb_build_object('status', 'already_used', 'current_status', v_invitation.status);
  END IF;

  IF v_invitation.expires_at <= NOW() THEN
    UPDATE tenant_member_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  -- Verify email matches
  IF lower(trim(p_user_email)) != lower(trim(v_invitation.email)) THEN
    RETURN jsonb_build_object('status', 'email_mismatch');
  END IF;

  -- Check existing membership
  SELECT id INTO v_existing_member
  FROM tenant_members
  WHERE tenant_id = v_invitation.tenant_id
    AND user_id = p_user_id
    AND status = 'active';

  IF v_existing_member IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_member');
  END IF;

  -- Create membership
  INSERT INTO tenant_members (tenant_id, user_id, role, status)
  VALUES (v_invitation.tenant_id, p_user_id, v_invitation.role, 'active')
  RETURNING id INTO v_membership_id;

  -- Mark invitation accepted
  UPDATE tenant_member_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'status', 'accepted',
    'membership_id', v_membership_id::TEXT,
    'tenant_id', v_invitation.tenant_id::TEXT,
    'role', v_invitation.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_tenant_member_invitation TO authenticated;

-- ─── Last Owner Protection RPC ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION safe_remove_tenant_member(
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

  -- Deactivate (preserve history)
  UPDATE tenant_members
  SET status = 'inactive'
  WHERE id = p_membership_id;

  RETURN jsonb_build_object('status', 'removed', 'membership_id', p_membership_id::TEXT);
END;
$$;

GRANT EXECUTE ON FUNCTION safe_remove_tenant_member TO authenticated;
