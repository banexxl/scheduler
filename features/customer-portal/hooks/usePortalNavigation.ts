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
  /** Where the brand/logo and "Home" should link, based on the current route. */
  homeHref: string;
} {
  const { tenant } = useTenantTheme();
  const sections = usePortalSections();
  const pathname = usePathname();
  const base = `/book/${tenant.slug}`;
  const portalBase = `${base}/portal`;

  const isActive = (href: string) =>
    pathname === href || pathname === `${href}/`;

  // Which surface are we on? Portal nav only applies inside the portal routes.
  const onPortal = pathname === portalBase || pathname.startsWith(`${portalBase}/`);

  // The brand/logo "home" is route-based: on the portal it goes to the portal
  // home; everywhere else it goes to the public book page.
  const homeHref = onPortal ? portalBase : base;

  let items: PortalNavItem[];

  if (onPortal) {
    // Portal navigation — links stay inside the customer portal.
    items = [
      { label: "Home", href: portalBase, active: isActive(portalBase) },
      { label: "Appointments", href: `${portalBase}/appointments`, active: isActive(`${portalBase}/appointments`) },
      { label: "Rewards", href: `${portalBase}/rewards`, active: isActive(`${portalBase}/rewards`) },
      { label: "Account", href: `${portalBase}/account`, active: isActive(`${portalBase}/account`) },
    ];
  } else {
    // Public storefront navigation — Home plus anchors to configured sections.
    items = [
      { label: "Home", href: base, active: isActive(base) },
      ...(sections.services ? [{ label: "Services", href: `${base}#services`, active: false }] : []),
      ...(sections.staff ? [{ label: "Staff", href: `${base}#staff`, active: false }] : []),
      ...(sections.locations ? [{ label: "Locations", href: `${base}#locations`, active: false }] : []),
      ...(sections.reviews ? [{ label: "Reviews", href: `${base}#reviews`, active: false }] : []),
      ...(sections.contact ? [{ label: "Contact", href: `${base}#contact`, active: false }] : []),
    ];
  }

  return { items, tenantSlug: tenant.slug, homeHref };
}
