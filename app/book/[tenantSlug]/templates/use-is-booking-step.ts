"use client";

/**
 * useIsBookingStep — Milestone 17.0.
 *
 * Returns true when the current pathname is a booking step sub-route
 * (e.g. /book/{slug}/services, /book/{slug}/staff, etc.) rather than
 * the root tenant landing page (/book/{slug}).
 *
 * Used by template shells to hide the Hero and CTA sections on
 * step pages where they crowd out the booking flow content,
 * especially on mobile viewports.
 */

import { usePathname } from "next/navigation";

const BOOKING_STEP_SEGMENTS = [
  "services",
  "staff",
  "locations",
  "date-time",
  "details",
  "review",
  "confirm",
];

export function useIsBookingStep(): boolean {
  const pathname = usePathname();

  // pathname looks like /book/{slug}/services, /book/{slug}/staff, etc.
  // Split and check the third segment (index 3: ["", "book", slug, step])
  const segments = pathname.split("/");
  const stepSegment = segments[3];

  return !!stepSegment && BOOKING_STEP_SEGMENTS.includes(stepSegment);
}
