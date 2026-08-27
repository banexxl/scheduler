import { notFound } from "next/navigation";
import { getTenantBranding } from "@/lib/branding/get-branding";
import { getFontEntry } from "@/lib/branding/font-loader";
import TenantThemeProvider from "@/providers/tenant-theme-provider";

/**
 * Public Booking Layout — Milestone 16.1 (Dynamic Theme Engine).
 *
 * Server Component that loads tenant branding and wraps all
 * /book/{tenantSlug} routes with the tenant's dynamic theme.
 *
 * Flow:
 * 1. Read tenant slug from route params
 * 2. Load branding (tenant record + published config + defaults)
 * 3. Resolve the Google Font to load
 * 4. Wrap children with TenantThemeProvider (MUI theme + CssBaseline + context)
 *
 * No page components are changed — all inherit the theme automatically.
 */
export default async function PublicBookingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // 1. Load branding (resolves tenant, published config, font detection)
  const result = await getTenantBranding(tenantSlug);

  if (!result.ok) {
    notFound();
  }

  const { branding } = result;

  // 2. Resolve Google Font entry for CSS variable injection
  const fontEntry = getFontEntry(branding.fontName);

  // 3. Build the className that injects the font CSS variable.
  //    If no supported font matched, fall back to the system font stack
  //    (MUI typography already includes fallbacks via the CSS var reference).
  const fontClassName = fontEntry?.variableClassName ?? "";

  return (
    <div className={fontClassName || undefined}>
      <TenantThemeProvider branding={branding}>
        {children}
      </TenantThemeProvider>
    </div>
  );
}
