import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PortalAccessForm from "@/features/customer-portal/components/portal-access-form";
import PortalDashboardPage from "@/features/customer-portal/components/portal-dashboard-page";
import { getCustomerPortalAppointments } from "@/features/customer-portal/services/portal-appointment-queries";
import { getCustomerWaitlistEntries } from "@/features/waitlist/services/waitlist-portal-queries";
import { autoLinkCustomerToTenant } from "@/features/customer-portal/services/auto-link-customer";

/**
 * Customer Portal — Supabase Auth based.
 *
 * 1. If authenticated + tenant_customers match → show dashboard
 * 2. If authenticated but no match → auto-link, then show dashboard
 * 3. If not authenticated → show access form (magic link / login links)
 */
export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve tenant via admin client (avoids RLS issues)
  const adminClient = createAdminClient();
  const { data: tenantRow } = await adminClient
    .from("tenants")
    .select("id, name, slug, default_timezone")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .single();

  if (!tenantRow) redirect(`/book/${tenantSlug}`);

  const tenantId = tenantRow.id;
  const tenantName = tenantRow.name;
  const timeZone = tenantRow.default_timezone;

  // Check Supabase Auth session
  let userEmail: string | null = null;
  let userId: string | null = null;
  let userName: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email?.trim().toLowerCase() ?? null;
      userId = user.id;
      userName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;
    }
  } catch {
    // Not authenticated
  }

  if (userEmail && userId) {
    // Check if tenant_customers record exists
    const { data: customerRow } = await (adminClient as never as ReturnType<typeof createAdminClient>)
      .from("tenant_customers" as never)
      .select("id" as never)
      .eq("tenant_id" as never, tenantId)
      .eq("email" as never, userEmail)
      .maybeSingle();

    // Auto-link if no record exists (first-time Google OAuth or fresh registration)
    if (!customerRow) {
      await autoLinkCustomerToTenant({
        userId,
        email: userEmail,
        fullName: userName,
        tenantId,
      });
    }

    // Load portal data
    const [data, waitlistEntries] = await Promise.all([
      getCustomerPortalAppointments(tenantId, userEmail, timeZone),
      getCustomerWaitlistEntries(tenantId, userEmail),
    ]);

    return (
      <PortalDashboardPage
        tenantSlug={tenantSlug}
        tenantName={tenantName}
        appointments={data}
        timeZone={timeZone}
        waitlistEntries={waitlistEntries}
      />
    );
  }

  // Not authenticated — show access form
  return (
    <PortalAccessForm
      tenantSlug={tenantSlug}
      tenantName={tenantName}
    />
  );
}
