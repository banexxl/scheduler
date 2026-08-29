"use server";

/**
 * Customer Registration Action — Tenant-scoped.
 *
 * Creates a Supabase Auth user, then:
 * 1. Creates a tenant_customers record for this business
 * 2. Creates a customer_accounts record (global profile)
 * 3. Creates a customer_account_tenant_links bridge record
 *
 * If the user already exists (signUp returns a session), auto-links
 * them to the tenant instead.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/helpers/get-app-url";
import { registerSchema } from "@/features/auth/schemas/register-schema";
import type { AuthActionResult } from "@/features/auth/types/auth-action-result";

export async function customerRegisterAction(
  tenantSlug: string,
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    name: formData.get("name"),
    phone: formData.get("phone"),
  };

  try {
    const validated = registerSchema.validateSync(
      { email: raw.email, password: raw.password, confirmPassword: raw.confirmPassword },
      { abortEarly: false }
    );

    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";

    if (!name) {
      return { success: false, fieldErrors: { name: "Name is required" } };
    }

    // 1. Resolve tenant
    const adminClient = createAdminClient();
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("id, slug")
      .eq("slug", tenantSlug)
      .in("status", ["active", "trialing"])
      .single();

    if (!tenant) {
      return { success: false, message: "This business is not available." };
    }

    // 2. Create Supabase Auth user
    const supabase = await createClient();
    const callbackUrl = `${getAppUrl()}/api/auth/callback?next=/book/${tenantSlug}/portal`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        emailRedirectTo: callbackUrl,
        data: { full_name: name },
      },
    });

    if (authError) {
      if (authError.status === 429) {
        return { success: false, message: "Too many attempts. Please try again later." };
      }
      if (authError.message?.includes("already registered")) {
        return { success: false, message: "An account with this email already exists. Please sign in instead." };
      }
      return { success: false, message: "Unable to create account. Please try again." };
    }

    const userId = authData.user?.id;
    const normalizedEmail = validated.email.trim().toLowerCase();

    // If we got a user ID, create the records immediately
    // (This happens when email confirmation is disabled or auto-confirmed)
    if (userId) {
      await linkCustomerToTenant(adminClient, {
        userId,
        tenantId: tenant.id,
        email: normalizedEmail,
        name,
        phone: phone || null,
      });
    }

    return {
      success: true,
      message: "Account created! Check your email to confirm, then sign in.",
      redirectTo: `/book/${tenantSlug}/login`,
    };
  } catch (error) {
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

// ─── Link Helper ─────────────────────────────────────────────────────────────

async function linkCustomerToTenant(
  adminClient: ReturnType<typeof createAdminClient>,
  input: { userId: string; tenantId: string; email: string; name: string; phone: string | null }
) {
  const { userId, tenantId, email, name, phone } = input;

  // Check if tenant_customer already exists for this email
  const { data: existingCustomer } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("email" as never, email)
    .single();

  let tenantCustomerId: string;

  if (existingCustomer) {
    tenantCustomerId = (existingCustomer as unknown as { id: string }).id;
    // Update user_id if not set
    await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("tenant_customers" as never)
      .update({ user_id: userId } as never)
      .eq("id" as never, tenantCustomerId)
      .is("user_id" as never, null);
  } else {
    // Create tenant_customer
    const { data: newCustomer } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("tenant_customers" as never)
      .insert({
        tenant_id: tenantId,
        email,
        name,
        phone_number: phone,
        user_id: userId,
      } as never)
      .select("id")
      .single();

    if (!newCustomer) return;
    tenantCustomerId = (newCustomer as unknown as { id: string }).id;
  }

  // Create or get customer_accounts (global profile)
  const { data: existingAccount } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("customer_accounts" as never)
    .select("id" as never)
    .eq("user_id" as never, userId)
    .single();

  let customerAccountId: string;

  if (existingAccount) {
    customerAccountId = (existingAccount as unknown as { id: string }).id;
  } else {
    const { data: newAccount } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_accounts" as never)
      .insert({
        user_id: userId,
        email,
        full_name: name,
        phone,
      } as never)
      .select("id")
      .single();

    if (!newAccount) return;
    customerAccountId = (newAccount as unknown as { id: string }).id;
  }

  // Create link (if not already linked)
  const { data: existingLink } = await (adminClient as never as ReturnType<typeof createAdminClient>)
    .from("customer_account_tenant_links" as never)
    .select("id" as never)
    .eq("customer_account_id" as never, customerAccountId)
    .eq("tenant_id" as never, tenantId)
    .eq("link_status" as never, "linked")
    .single();

  if (!existingLink) {
    await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("customer_account_tenant_links" as never)
      .insert({
        customer_account_id: customerAccountId,
        tenant_id: tenantId,
        tenant_customer_id: tenantCustomerId,
        link_status: "linked",
        link_method: "account_registration",
        linked_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
      } as never);
  }
}
