import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import TenantPublicThemeProvider from "@/features/branding/components/tenant-public-theme-provider";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Public booking layout — Milestone 15.5.
 *
 * Wraps all /book/{tenantSlug} routes with the tenant's published branding.
 * Falls back to default theme if no branding is configured.
 * Draft branding is NEVER exposed here.
 */
export default async function PublicBookingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Resolve tenant ID from slug
  const supabase = createServiceRoleClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .in("status", ["active", "trialing"])
    .maybeSingle();

  if (!tenant) {
    // No tenant — render children without branding (will show 404 at page level)
    return <>{children}</>;
  }

  // Resolve published theme (falls back to defaults if no branding configured)
  const theme = await resolvePublishedTenantTheme(tenant.id);

  return (
    <TenantPublicThemeProvider theme={theme}>
      {children}
    </TenantPublicThemeProvider>
  );
}
