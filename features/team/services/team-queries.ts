import "server-only";

/**
 * Team Query Services.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { TeamMemberDTO, TeamInvitationDTO, TenantRole, PendingTenantInvite } from "../types/team";
import { PENDING_INVITE_KEY } from "../types/team";

export async function getTeamMembers(tenantId: string): Promise<TeamMemberDTO[]> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("tenant_members")
    .select("id, user_id, role, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (!data) return [];

  // Load user emails
  const userIds = data.map(r => r.user_id as string);
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userMap = new Map(
    (users ?? []).filter(u => userIds.includes(u.id)).map(u => [u.id, u])
  );

  return data.map((row): TeamMemberDTO => {
    const user = userMap.get(row.user_id as string);
    return {
      id: row.id as string,
      displayName: user?.user_metadata?.full_name as string ?? null,
      email: user?.email ?? "unknown",
      role: row.role as TenantRole,
      status: row.status as string,
      joinedAt: row.created_at as string,
    };
  });
}

/**
 * Pending invitations are derived from Supabase Auth users that carry a
 * `pending_tenant_invite` in their `app_metadata` for this tenant and have not
 * yet accepted (no active membership in this tenant).
 */
export async function getTeamInvitations(tenantId: string): Promise<TeamInvitationDTO[]> {
  const supabase = createServiceRoleClient();

  // Active members of this tenant — used to exclude already-accepted invites.
  const { data: memberRows } = await supabase
    .from("tenant_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  const activeMemberIds = new Set((memberRows ?? []).map(r => r.user_id as string));

  const { data: { users } } = await supabase.auth.admin.listUsers();

  const invitations: TeamInvitationDTO[] = [];
  for (const user of users ?? []) {
    const pending = (user.app_metadata?.[PENDING_INVITE_KEY] ?? null) as PendingTenantInvite | null;
    if (!pending || pending.tenant_id !== tenantId) continue;
    if (activeMemberIds.has(user.id)) continue; // already accepted

    invitations.push({
      id: user.id,
      email: user.email ?? "unknown",
      role: pending.role,
      status: "pending",
      invitedAt: pending.invited_at,
    });
  }

  invitations.sort((a, b) => (a.invitedAt < b.invitedAt ? 1 : -1));
  return invitations;
}
