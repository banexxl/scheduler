import "server-only";

/**
 * Staff Query Services — Milestone 12.2.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { StaffProfileDTO } from "../types/staff";

export async function getStaffProfiles(tenantId: string): Promise<StaffProfileDTO[]> {
  const supabase = createServiceRoleClient();

  const { data } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("staff_profiles" as never)
    .select("id, resource_id, tenant_member_id, display_name, job_title, bio, avatar_url, is_active, is_public" as never)
    .eq("tenant_id" as never, tenantId)
    .order("display_name" as never, { ascending: true });

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;
  const memberIds = rows.filter(r => r.tenant_member_id).map(r => r.tenant_member_id as string);
  const resourceIds = rows.map(r => r.resource_id as string);

  // Batch load member roles
  const memberMap = new Map<string, { role: string; active: boolean }>();
  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("tenant_members")
      .select("id, role, status")
      .in("id", memberIds);
    if (members) {
      for (const m of members as Array<{ id: string; role: string; status: string }>) {
        memberMap.set(m.id, { role: m.role, active: m.status === "active" });
      }
    }
  }

  // Batch load service assignments
  const serviceMap = new Map<string, string[]>();
  if (resourceIds.length > 0) {
    const { data: assignments } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("service_resources" as never)
      .select("resource_id, service_id" as never)
      .eq("tenant_id" as never, tenantId)
      .in("resource_id" as never, resourceIds as never);

    if (assignments) {
      for (const a of assignments as unknown as Array<{ resource_id: string; service_id: string }>) {
        const list = serviceMap.get(a.resource_id) ?? [];
        list.push(a.service_id);
        serviceMap.set(a.resource_id, list);
      }
    }
  }

  // Batch load location assignments
  const locationMap = new Map<string, string[]>();
  if (resourceIds.length > 0) {
    const { data: locs } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("resource_locations" as never)
      .select("resource_id, location_id" as never)
      .in("resource_id" as never, resourceIds as never);

    if (locs) {
      for (const l of locs as unknown as Array<{ resource_id: string; location_id: string }>) {
        const list = locationMap.get(l.resource_id) ?? [];
        list.push(l.location_id);
        locationMap.set(l.resource_id, list);
      }
    }
  }

  return rows.map((row): StaffProfileDTO => {
    const memberId = row.tenant_member_id as string | null;
    const memberInfo = memberId ? memberMap.get(memberId) : null;

    return {
      id: row.id as string,
      resourceId: row.resource_id as string,
      displayName: row.display_name as string,
      jobTitle: (row.job_title as string) ?? null,
      bio: (row.bio as string) ?? null,
      avatarUrl: (row.avatar_url as string) ?? null,
      isActive: Boolean(row.is_active),
      isPublic: Boolean(row.is_public),
      account: memberId ? {
        linked: true,
        memberId,
        role: memberInfo?.role ?? null,
        active: memberInfo?.active ?? false,
      } : null,
      services: serviceMap.get(row.resource_id as string) ?? [],
      locations: locationMap.get(row.resource_id as string) ?? [],
    };
  });
}

/**
 * Resolves the staff resource ID for the currently authenticated member.
 * Used for "my schedule" functionality.
 */
export async function getMyStaffResourceId(
  tenantId: string,
  membershipId: string
): Promise<string | null> {
  const supabase = createServiceRoleClient();

  const { data } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
    .from("staff_profiles" as never)
    .select("resource_id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("tenant_member_id" as never, membershipId)
    .eq("is_active" as never, true)
    .maybeSingle();

  if (!data) return null;
  return (data as unknown as { resource_id: string }).resource_id;
}
