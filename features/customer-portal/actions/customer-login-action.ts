"use server";

/**
 * Customer Login Action — Tenant-scoped.
 *
 * Signs in with Supabase Auth, then auto-links the user to the tenant
 * if they have a matching tenant_customers record by email but no link yet.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema } from "@/features/auth/schemas/login-schema";
import type { AuthActionResult } from "@/features/auth/types/auth-action-result";

export async function customerLoginAction(
  tenantSlug: string,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const validated = loginSchema.validateSync(raw, { abortEarly: false });

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      return { success: false, message: "The email or password is incorrect." };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "The email or password is incorrect." };
    }

    // Auto-link to tenant if needed
    await autoLinkCustomerToTenant(user.id, user.email ?? validated.email, tenantSlug);

    redirect(`/book/${tenantSlug}/portal`);
  } catch (error) {
    // Next.js redirect throws a special error — rethrow it
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as { inner: Array<{ path?: string; message: string }> };
      const fieldErrors: Record<string, string> = {};
      yupError.inner.forEach((err) => {
        if (err.path) fieldErrors[err.path] = err.message;
      });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "An unexpected error occurred. Please try again." };
  }
}

// ─── Auto-Link Helper ────────────────────────────────────────────────────────

/**
 * If the user has a tenant_customers record (from a previous booking) but
 * no user_id or account link, automatically creates the link.
 */
async function autoLinkCustomerToTenant(
  userId: string,
  email: string,
  tenantSlug: string
): Promise<void> {
  const adminClient = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  // Resolve tenant
  const { data: tenant } = await adminClient
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .single();

  if (!tenant) return;

  // Check if tenant_customer exists for this email
  const { data: customerRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id, user_id" as never)
    .eq("tenant_id" as never, tenant.id)
    .eq("email" as never, normalizedEmail)
    .single();

  if (!customerRow) return; // No customer record for this tenant

  const customer = customerRow as unknown as { id: string; user_id: string | null };

  // Set user_id on tenant_customer if not set
  if (!customer.user_id) {
    await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("tenant_customers" as never)
      .update({ user_id: userId } as never)
      .eq("id" as never, customer.id);
  }

  // Ensure customer_accounts exists
  const { data: existingAccount } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("customer_accounts" as never)
    .select("id" as never)
    .eq("user_id" as never, userId)
    .single();

  let accountId: string;

  if (existingAccount) {
    accountId = (existingAccount as unknown as { id: string }).id;
  } else {
    const { data: newAccount } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_accounts" as never)
      .insert({
        user_id: userId,
        email: normalizedEmail,
      } as never)
      .select("id")
      .single();

    if (!newAccount) return;
    accountId = (newAccount as unknown as { id: string }).id;
  }

  // Create link if not already linked
  const { data: existingLink } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("id" as never)
    .eq("customer_account_id" as never, accountId)
    .eq("tenant_id" as never, tenant.id)
    .eq("link_status" as never, "linked")
    .single();

  if (!existingLink) {
    await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_account_tenant_links" as never)
      .insert({
        customer_account_id: accountId,
        tenant_id: tenant.id,
        tenant_customer_id: customer.id,
        link_status: "linked",
        link_method: "verified_email",
        linked_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      } as never);
  }
}
