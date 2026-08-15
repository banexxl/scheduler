import type { MetadataRoute } from "next";

/**
 * Global Robots.txt — Milestone 15.13.
 *
 * Controls search engine indexing behavior:
 * - Public business storefronts: indexable
 * - Admin/dashboard routes: not indexed
 * - Token-based routes: not indexed (already enforced by X-Robots-Tag in next.config.ts)
 * - Platform admin: not indexed
 * - Customer portal: not indexed
 * - Payment return: not indexed
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://get-slot.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/book/",
        disallow: [
          // Business admin routes
          "/*/dashboard",
          "/*/settings",
          "/*/appointments",
          "/*/calendar",
          "/*/customers",
          "/*/team",
          "/*/analytics",
          "/*/campaigns",
          "/*/automations",
          "/*/imports",
          "/*/gift-cards",
          "/*/packages",
          "/*/reviews",
          "/*/waitlist",

          // Platform admin
          "/platform",

          // Auth routes
          "/login",
          "/register",
          "/forgot-password",
          "/update-password",
          "/invite/",

          // Token-based routes (sensitive)
          "/book/*/portal/session/",
          "/book/*/payment/return",
          "/book/*/review/",
          "/manage-appointment/",
          "/book/*/communications/unsubscribe/",

          // Internal
          "/api/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/book/sitemap.xml`,
  };
}
