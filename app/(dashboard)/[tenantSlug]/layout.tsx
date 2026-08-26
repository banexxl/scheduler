import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { checkTenantAccess } from "@/lib/billing/subscription-guard";
import BusinessShell from "@/features/business/components/business-shell";

/**
 * Dashboard layout — Milestone 15.14.
 *
 * Runs subscription guard on every dashboard page.
 * Whitelisted paths (accessible even when subscription expired):
 * - /{tenantSlug}/billing-required
 * - /{tenantSlug}/settings/billing
 *
 * Platform admins always bypass.
 */

const BILLING_EXEMPT_SUFFIXES = [
  "/billing-required",
  "/settings/billing",
  "/settings/billing/plans",
  "/settings/billing/return",
];

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { user, tenant, membership } = await requireTenantMember(tenantSlug);

  // Determine current path
  const headersList = await headers();
  const pathname = headersList.get("x-matched-path") ?? headersList.get("x-invoke-path") ?? "";

  // Check if current path is exempt from billing guard
  const isExempt = BILLING_EXEMPT_SUFFIXES.some(suffix => pathname.endsWith(suffix));

  // Run subscription guard (unless path is exempt)
  if (!isExempt) {
    const result = await checkTenantAccess(tenant.id, user.id);

    if (result.access !== "allowed") {
      redirect(`/${tenantSlug}/billing-required`);
    }
  }

  return (
    <BusinessShell
      tenantName={tenant.name}
      tenantSlug={tenantSlug}
      userEmail={user.email ?? ""}
      role={membership.role}
    >
      {children}
    </BusinessShell>
  );
}
