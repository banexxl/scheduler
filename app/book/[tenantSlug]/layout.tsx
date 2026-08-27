import { notFound } from "next/navigation";
import { getTenantBranding } from "@/lib/branding/get-branding";
import { getFontEntry } from "@/lib/branding/font-loader";
import { getTemplateDefinition } from "@/features/templates/registry";
import TenantThemeProvider from "@/providers/tenant-theme-provider";
import BookingProvider from "@/features/booking/context/BookingProvider";

/**
 * Public Booking Layout — Milestones 16.1, 16.2, 17.0.
 *
 * Server Component that loads tenant branding and wraps all
 * /book/{tenantSlug} routes with:
 * 1. Dynamic MUI theme (colors, typography, shape)
 * 2. Google Font loading via CSS variable injection
 * 3. Active template shell (layout wrapper)
 * 4. BookingProvider for shared booking state across pages
 *
 * No page components are changed — all inherit the theme and
 * template automatically.
 */
export default async function PublicBookingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // 1. Load branding + template (resolves tenant, published config, font, template)
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

  return (
    <div className={fontClassName || undefined}>
      <TenantThemeProvider branding={branding}>
        <BookingProvider>
          <TemplateShell>
            {children}
          </TemplateShell>
        </BookingProvider>
      </TenantThemeProvider>
    </div>
  );
}
