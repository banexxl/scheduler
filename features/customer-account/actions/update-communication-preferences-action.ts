"use server";

/**
 * Update Customer Communication Preferences — Milestone 9.4.
 */

import { requireUser } from "@/lib/auth/require-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCustomerAccountByUserId } from "../services/customer-account-queries";
import { upsertCustomerNotificationPreferences } from "../services/customer-notification-preferences";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateCommunicationPreferencesAction(
  tenantSlug: string,
  input: {
    appointmentRemindersEnabled?: boolean;
    reviewRequestsEnabled?: boolean;
    waitlistNotificationsEnabled?: boolean;
  }
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const account = await getCustomerAccountByUserId(user.id);
    if (!account) return { success: false, error: "Account not found." };

    // Resolve tenant
    const supabase = createAdminClient();
    const { data: tenantRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("tenants" as never)
      .select("id" as never)
      .eq("slug" as never, tenantSlug)
      .single();

    if (!tenantRow) return { success: false, error: "Business not found." };
    const tenantId = (tenantRow as unknown as { id: string }).id;

    // Verify active link
    const { data: link } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_account_tenant_links" as never)
      .select("tenant_customer_id" as never)
      .eq("customer_account_id" as never, account.id)
      .eq("tenant_id" as never, tenantId)
      .eq("link_status" as never, "linked")
      .single();

    if (!link) return { success: false, error: "Not linked to this business." };
    const tenantCustomerId = (link as unknown as { tenant_customer_id: string }).tenant_customer_id;

    // Upsert preferences
    const result = await upsertCustomerNotificationPreferences(tenantId, tenantCustomerId, input);
    if (!result.success) return { success: false, error: "Failed to save preferences." };

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save preferences." };
  }
}
