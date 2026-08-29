import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import CustomerRegisterForm from "@/features/customer-portal/components/customer-register-form";

/**
 * Tenant-scoped Customer Registration Page.
 *
 * /book/{tenantSlug}/register
 *
 * If already logged in AND is a customer of this tenant, redirects to portal.
 */
export default async function CustomerRegisterPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve tenant via admin client (avoids RLS/session issues)
  const adminClient = createAdminClient();
  const { data: tenantRow } = await adminClient
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .single();

  if (!tenantRow) redirect(`/book/${tenantSlug}`);

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
    if (error && typeof error === "object" && "digest" in error) throw error;
  }

  return (
    <CustomerRegisterForm
      tenantSlug={tenantSlug}
      tenantName={tenantRow.name}
    />
  );
}
