"use client";

/**
 * Portal Navigation Hook — Milestone 16.3.
 *
 * Returns navigation items for the public booking portal header.
 * Highlights the active route based on the current pathname.
 */

import { usePathname } from "next/navigation";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import type { PortalNavItem } from "../types";

/**
 * Returns the portal navigation items with active state.
 * Used by Header and MobileNavigation components.
 */
export function usePortalNavigation(): {
  items: PortalNavItem[];
  tenantSlug: string;
} {
  const { tenant } = useTenantTheme();
  const pathname = usePathname();
  const base = `/book/${tenant.slug}`;

  const items: PortalNavItem[] = [
    {
      label: "Home",
      href: base,
      active: pathname === base,
    },
    {
      label: "Services",
      href: `${base}/services`,
      active: pathname.startsWith(`${base}/services`),
    },
    {
      label: "Staff",
      href: `${base}/staff`,
      active: pathname.startsWith(`${base}/staff`),
    },
    {
      label: "Locations",
      href: `${base}/locations`,
      active: pathname.startsWith(`${base}/locations`),
    },
    {
      label: "Reviews",
      href: `${base}/review`,
      active: pathname.startsWith(`${base}/review`),
    },
    {
      label: "Contact",
      href: `${base}#contact`,
      active: false,
    },
  ];

  return { items, tenantSlug: tenant.slug };
}
