import "server-only";

/**
 * Team Query Services — Milestone 12.1.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { TeamMemberDTO, TeamInvitationDTO, TenantRole } from "../types/team";

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

export async function getTeamInvitations(tenantId: string): Promise<TeamInvitationDTO[]> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("tenant_member_invitations" as never)
    .select("id, email, role, status, created_at, expires_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "pending")
    .order("created_at" as never, { ascending: false });

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((row): TeamInvitationDTO => ({
    id: row.id as string,
    email: row.email as string,
    role: row.role as TenantRole,
    status: row.status as "pending",
    invitedAt: row.created_at as string,
    expiresAt: row.expires_at as string,
  }));
}
