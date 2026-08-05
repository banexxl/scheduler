/**
 * Reserved slugs that cannot be used as tenant slugs.
 * These conflict with application routes, system paths, or common subdomains.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "account",
  "admin",
  "api",
  "auth",
  "billing",
  "booking",
  "callback",
  "confirm",
  "customers",
  "dashboard",
  "docs",
  "features",
  "forgot-password",
  "help",
  "locations",
  "login",
  "logout",
  "mail",
  "platform",
  "pricing",
  "register",
  "robots.txt",
  "security",
  "settings",
  "sitemap.xml",
  "static",
  "status",
  "subscriptions",
  "support",
  "team",
  "update-password",
  "users",
  "www",
]);

/**
 * Checks whether a slug is reserved and cannot be used as a tenant slug.
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase().trim());
}
