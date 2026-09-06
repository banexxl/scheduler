"use client";

/**
 * Portal Navigation Hook — anchor-based single-page navigation.
 *
 * All content sections live on one page. Navigation items are
 * anchor links that smooth-scroll to sections on /book/{tenantSlug}.
 */

import { usePathname } from "next/navigation";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import { usePortalSections } from "../components/portal-sections-provider";
import type { PortalNavItem } from "../types";

export function usePortalNavigation(): {
  items: PortalNavItem[];
  tenantSlug: string;
} {
  const { tenant } = useTenantTheme();
  const sections = usePortalSections();
  const pathname = usePathname();
  const base = `/book/${tenant.slug}`;
  const isHome = pathname === base || pathname === `${base}/`;

  // Home is always shown; every other link is only shown when the matching
  // section is actually set up (mirrors the conditional sections on the page).
  const items: PortalNavItem[] = [
    { label: "Home", href: base, active: isHome },
    ...(sections.services ? [{ label: "Services", href: `${base}#services`, active: false }] : []),
    ...(sections.staff ? [{ label: "Staff", href: `${base}#staff`, active: false }] : []),
    ...(sections.locations ? [{ label: "Locations", href: `${base}#locations`, active: false }] : []),
    ...(sections.reviews ? [{ label: "Reviews", href: `${base}#reviews`, active: false }] : []),
    ...(sections.contact ? [{ label: "Contact", href: `${base}#contact`, active: false }] : []),
  ];

  return { items, tenantSlug: tenant.slug };
}
