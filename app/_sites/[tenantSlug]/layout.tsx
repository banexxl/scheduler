/**
 * Internal rendering layout for public tenant websites.
 *
 * This route is INTERNAL ONLY. Users never navigate directly to /_sites/...
 *
 * In production, the proxy rewrites subdomain requests:
 *   https://johns-barbershop.get-slot.app/booking
 *   → internally renders /_sites/johns-barbershop/booking
 *
 * The browser URL remains the subdomain URL.
 */
export default function PublicSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
