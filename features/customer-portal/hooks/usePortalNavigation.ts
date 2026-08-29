"use client";

/**
 * Portal Navigation Hook — anchor-based single-page navigation.
 *
 * All content sections live on one page. Navigation items are
 * anchor links that smooth-scroll to sections on /book/{tenantSlug}.
 */

import { usePathname } from "next/navigation";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import type { PortalNavItem } from "../types";

export function usePortalNavigation(): {
  items: PortalNavItem[];
  tenantSlug: string;
} {
  const { tenant } = useTenantTheme();
  const pathname = usePathname();
  const base = `/book/${tenant.slug}`;
  const isHome = pathname === base || pathname === `${base}/`;

  const items: PortalNavItem[] = [
    { label: "Home", href: base, active: isHome },
    { label: "Services", href: `${base}#services`, active: false },
    { label: "Staff", href: `${base}#staff`, active: false },
    { label: "Locations", href: `${base}#locations`, active: false },
    { label: "Reviews", href: `${base}#reviews`, active: false },
    { label: "Contact", href: `${base}#contact`, active: false },
  ];

  return { items, tenantSlug: tenant.slug };
}
