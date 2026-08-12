import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Platform Tenant Queries — Milestone 14.1.
 *
 * Server-side queries for the platform admin tenant management page.
 */

export type PlatformTenantListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  memberCount: number;
  subscriptionStatus: string | null;
};

export async function listPlatformTenants(input?: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tenants: PlatformTenantListItem[]; total: number }> {
  const adminClient = createAdminClient();
  const limit = Math.min(Math.max(input?.limit ?? 25, 1), 100);
  const offset = Math.max(input?.offset ?? 0, 0);

  let query = adminClient
    .from("tenants" as never)
    .select("id, name, slug, status, created_at", { count: "exact" })
    .order("created_at" as never, { ascending: false })
    .range(offset, offset + limit - 1);

  if (input?.status) {
    query = query.eq("status" as never, input.status);
  }

  if (input?.search) {
    const term = `%${input.search}%`;
    query = query.or(`name.ilike.${term},slug.ilike.${term}` as never);
  }

  const { data, count, error } = await query;
  if (error) {
    throw new Error(`[platform-tenants] Unable to load tenants: ${error.message}`);
  }

  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const tenantIds = rows.map((r) => String(r.id));

  // Batch fetch member counts
  const memberCounts = new Map<string, number>();
  if (tenantIds.length > 0) {
    const { data: members } = await adminClient
      .from("tenant_members" as never)
      .select("tenant_id")
      .in("tenant_id" as never, tenantIds as never)
      .eq("status" as never, "active");

    const memberRows = (members as Array<Record<string, unknown>> | null) ?? [];
    for (const m of memberRows) {
      const tid = String(m.tenant_id ?? "");
      memberCounts.set(tid, (memberCounts.get(tid) ?? 0) + 1);
    }
  }

  // Batch fetch subscription status
  const subStatuses = new Map<string, string>();
  if (tenantIds.length > 0) {
    const { data: subs } = await adminClient
      .from("tenant_subscriptions" as never)
      .select("tenant_id, status")
      .in("tenant_id" as never, tenantIds as never)
      .order("updated_at" as never, { ascending: false });

    const subRows = (subs as Array<Record<string, unknown>> | null) ?? [];
    for (const s of subRows) {
      const tid = String(s.tenant_id ?? "");
      if (!subStatuses.has(tid)) {
        subStatuses.set(tid, String(s.status ?? "none"));
      }
    }
  }

  const tenants: PlatformTenantListItem[] = rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    status: String(row.status ?? ""),
    createdAt: String(row.created_at ?? ""),
    memberCount: memberCounts.get(String(row.id)) ?? 0,
    subscriptionStatus: subStatuses.get(String(row.id)) ?? null,
  }));

  return { tenants, total: count ?? 0 };
}
