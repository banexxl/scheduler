"use client";

/**
 * useIsBookingStep — determines if hero/CTA should be hidden.
 *
 * Returns true for sub-routes where the hero and CTA sections
 * would crowd out the content (portal, auth, manage pages).
 * The main storefront page (/) shows them.
 */

import { usePathname } from "next/navigation";

const HIDE_HERO_SEGMENTS = [
  "portal",
  "login",
  "register",
  "manage",
  "confirm",
  "payment",
  "communications",
  "waitlist",
  "gift-cards",
];

export function useIsBookingStep(): boolean {
  const pathname = usePathname();

  // pathname: /book/{slug}/portal, /book/{slug}/login, etc.
  const segments = pathname.split("/");
  const stepSegment = segments[3];

  return !!stepSegment && HIDE_HERO_SEGMENTS.includes(stepSegment);
}
