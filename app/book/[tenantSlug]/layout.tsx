/**
 * Public booking layout — Milestones 6.11, 8.5.
 * Minimal wrapper — branding handled by PublicBookingShell component.
 * No authentication required.
 */
export default function PublicBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
