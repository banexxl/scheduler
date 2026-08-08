"use server";

/**
 * Loyalty Actions — Milestone 8.10.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { success: true } | { success: false; error: string };

// ─── Update Settings ─────────────────────────────────────────────────────────

export async function updateLoyaltySettingsAction(
  tenantSlug: string,
  input: {
    isEnabled: boolean;
    pointsPerCompletedAppointment: number;
    countCompletedVisits: boolean;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin"].includes(membership.role))
      return { success: false, error: "Insufficient permissions." };

    const supabase = createAdminClient();
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenant_loyalty_settings" as never)
      .upsert({
        tenant_id: tenant.id,
        is_enabled: input.isEnabled,
        points_per_completed_appointment: input.pointsPerCompletedAppointment,
        count_completed_visits: input.countCompletedVisits,
      } as never, { onConflict: "tenant_id" } as never);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save loyalty settings." };
  }
}

// ─── Adjust Points ───────────────────────────────────────────────────────────

export async function adjustCustomerLoyaltyAction(
  tenantSlug: string,
  input: { customerId: string; delta: number; reason: string }
): Promise<ActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin"].includes(membership.role))
      return { success: false, error: "Insufficient permissions." };

    if (!input.delta || input.delta === 0)
      return { success: false, error: "Amount cannot be zero." };
    if (!input.reason?.trim())
      return { success: false, error: "Reason is required." };

    const supabase = createAdminClient();

    // Get or create account
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_loyalty_accounts" as never)
      .upsert({ tenant_id: tenant.id, customer_id: input.customerId } as never,
        { onConflict: "tenant_id,customer_id" } as never);

    // Load account
    const { data: acctRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_loyalty_accounts" as never)
      .select("id, points_balance" as never)
      .eq("tenant_id" as never, tenant.id)
      .eq("customer_id" as never, input.customerId)
      .single();

    if (!acctRow) return { success: false, error: "Account not found." };
    const acct = acctRow as unknown as { id: string; points_balance: number };

    const newBalance = acct.points_balance + input.delta;
    if (newBalance < 0) return { success: false, error: "Cannot reduce below zero." };

    // Update balance
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_loyalty_accounts" as never)
      .update({ points_balance: newBalance } as never)
      .eq("id" as never, acct.id);

    // Insert ledger
    const txType = input.delta > 0 ? "manual_credit" : "manual_debit";
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_loyalty_transactions" as never)
      .insert({
        tenant_id: tenant.id,
        customer_loyalty_account_id: acct.id,
        customer_id: input.customerId,
        transaction_type: txType,
        points_delta: input.delta,
        balance_after: newBalance,
        reason: input.reason.trim(),
        created_by: user.id,
      } as never);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to adjust loyalty." };
  }
}
