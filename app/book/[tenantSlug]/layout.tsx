import { notFound } from "next/navigation";
import { getTenantBranding } from "@/lib/branding/get-branding";
import { getFontEntry } from "@/lib/branding/font-loader";
import { getTemplateDefinition } from "@/features/templates/registry";
import TenantThemeProvider from "@/providers/tenant-theme-provider";
import BookingProvider from "@/features/booking/context/BookingProvider";
import PortalAuthProvider from "@/features/customer-portal/components/portal-auth-provider";
import PortalSectionsProvider from "@/features/customer-portal/components/portal-sections-provider";
import { resolvePublicSite } from "@/features/public-site/services/public-site-resolver";
import { createClient } from "@/lib/supabase/server";

/**
 * Public Booking Layout — Milestones 16.1, 16.2, 17.0.
 *
 * Server Component that loads tenant branding and wraps all
 * /book/{tenantSlug} routes with:
 * 1. Dynamic MUI theme (colors, typography, shape)
 * 2. Google Font loading via CSS variable injection
 * 3. Active template shell (layout wrapper)
 * 4. BookingProvider for shared booking state across pages
 * 5. PortalAuthProvider for customer auth state
 */
export default async function PublicBookingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // 1. Load branding + template
  const result = await getTenantBranding(tenantSlug);

  if (!result.ok) {
    notFound();
  }

  const { branding } = result;

  // 2. Resolve Google Font entry for CSS variable injection
  const fontEntry = getFontEntry(branding.fontName);
  const fontClassName = fontEntry?.variableClassName ?? "";

  // 3. Resolve template shell component
  const templateDef = getTemplateDefinition(branding.templateId);
  const TemplateShell = templateDef.component;

  // 3b. Resolve which content sections are actually set up so the header
  //     navigation only links to sections that will render on the page.
  const siteResult = await resolvePublicSite(tenantSlug);
  const site = siteResult.data;
  const hasContactInfo =
    (site?.locations ?? []).some(
      (loc) => loc.streetAddress || loc.phoneNumber || loc.email
    ) || (site?.tenant?.socialLinks?.length ?? 0) > 0;

  const sections = {
    services: (site?.services?.length ?? 0) > 0,
    staff: (site?.staff?.length ?? 0) > 0,
    locations: (site?.locations?.length ?? 0) > 0,
    reviews: (site?.reviews?.reviews?.length ?? 0) > 0,
    contact: hasContactInfo,
  };

  // 4. Check auth state (non-blocking)
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // Not authenticated — fine
  }

  return (
    <div className={fontClassName || undefined} style={{ minHeight: "100vh" }}>
      <TenantThemeProvider branding={branding}>
        <PortalAuthProvider userEmail={userEmail}>
          <PortalSectionsProvider sections={sections}>
            <BookingProvider>
              <TemplateShell>
                {children}
              </TemplateShell>
            </BookingProvider>
          </PortalSectionsProvider>
        </PortalAuthProvider>
      </TenantThemeProvider>
    </div>
  );
}
