import "server-only";

/**
 * Customer Account Query Services — Milestone 9.1.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerAccount, LinkedBusiness } from "../types/customer-account";

// ─── Get Account by Auth User ────────────────────────────────────────────────

export async function getCustomerAccountByUserId(
  userId: string
): Promise<CustomerAccount | null> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_accounts" as never)
    .select("id, user_id, full_name, email, phone, avatar_url, preferred_language, is_active, email_verified_at, created_at" as never)
    .eq("user_id" as never, userId)
    .single();

  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    fullName: (row.full_name as string) ?? null,
    email: row.email as string,
    phone: (row.phone as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    preferredLanguage: (row.preferred_language as string) ?? null,
    isActive: Boolean(row.is_active),
    emailVerifiedAt: (row.email_verified_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ─── Get or Create Account (Lazy) ───────────────────────────────────────────

export async function getOrCreateCustomerAccount(
  userId: string,
  email: string,
  fullName?: string | null
): Promise<CustomerAccount> {
  const existing = await getCustomerAccountByUserId(userId);
  if (existing) return existing;

  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_accounts" as never)
    .insert({
      user_id: userId,
      email: email.toLowerCase().trim(),
      full_name: fullName ?? null,
    } as never)
    .select("id, user_id, full_name, email, phone, avatar_url, preferred_language, is_active, email_verified_at, created_at")
    .single();

  if (!data) throw new Error("Failed to create customer account");

  const row = data as unknown as Record<string, unknown>;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    fullName: (row.full_name as string) ?? null,
    email: row.email as string,
    phone: (row.phone as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    preferredLanguage: (row.preferred_language as string) ?? null,
    isActive: Boolean(row.is_active),
    emailVerifiedAt: (row.email_verified_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ─── Get Linked Businesses ───────────────────────────────────────────────────

export async function getLinkedBusinesses(
  customerAccountId: string
): Promise<LinkedBusiness[]> {
  const supabase = createAdminClient();

  const { data: links } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("tenant_id, linked_at" as never)
    .eq("customer_account_id" as never, customerAccountId)
    .eq("link_status" as never, "linked");

  if (!links || (links as unknown as unknown[]).length === 0) return [];

  const rows = links as unknown as Array<{ tenant_id: string; linked_at: string }>;
  const tenantIds = rows.map(r => r.tenant_id);

  const { data: tenants } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenants" as never)
    .select("id, name, slug" as never)
    .in("id" as never, tenantIds as never);

  const tenantMap = new Map(
    ((tenants ?? []) as unknown as Array<{ id: string; name: string; slug: string }>)
      .map(t => [t.id, { name: t.name, slug: t.slug }])
  );

  return rows.map((row): LinkedBusiness => ({
    tenantId: row.tenant_id,
    tenantName: tenantMap.get(row.tenant_id)?.name ?? "Business",
    tenantSlug: tenantMap.get(row.tenant_id)?.slug ?? "",
    linkedAt: row.linked_at,
  }));
}
