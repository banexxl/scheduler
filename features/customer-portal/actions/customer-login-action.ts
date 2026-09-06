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
import { autoLinkCustomerToTenant } from "@/features/customer-portal/services/auto-link-customer";
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

    // Resolve the tenant, then ensure the customer is linked to it. The shared
    // service creates the tenant_customers row + account link when missing, so
    // a freshly registered customer is always associated with this tenant on
    // first login (regardless of email-confirmation timing).
    const adminClient = createAdminClient();
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .in("status", ["active", "trialing"])
      .single();

    if (tenant) {
      await autoLinkCustomerToTenant({
        userId: user.id,
        email: user.email ?? validated.email,
        fullName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        tenantId: tenant.id,
      });
    }

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


