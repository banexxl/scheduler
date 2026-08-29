import { redirect } from "next/navigation";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import CustomerLoginForm from "@/features/customer-portal/components/customer-login-form";

/**
 * Tenant-scoped Customer Login Page.
 *
 * /book/{tenantSlug}/login
 *
 * If already logged in AND has a tenant_customers record for this tenant,
 * redirects to portal. Otherwise shows the login form.
 */
export default async function CustomerLoginPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve tenant — use admin client to avoid RLS/session issues
  const adminClient = createAdminClient();
  const { data: tenantRow } = await adminClient
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .single();

  if (!tenantRow) redirect(`/book/${tenantSlug}`);

  // Check if user is already authenticated as a customer of this tenant
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email) {
      const { data: customerRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
        .from("tenant_customers" as never)
        .select("id" as never)
        .eq("tenant_id" as never, tenantRow.id)
        .eq("email" as never, user.email.trim().toLowerCase())
        .maybeSingle();

      if (customerRow) {
        redirect(`/book/${tenantSlug}/portal`);
      }
    }
  } catch (error) {
    // Rethrow Next.js redirect
    if (error && typeof error === "object" && "digest" in error) throw error;
    // Auth check failed — show login form
  }

  return (
    <CustomerLoginForm
      tenantSlug={tenantSlug}
      tenantName={tenantRow.name}
    />
  );
}
