import BookingDetailsClientPage from "./client-page";

export async function generateMetadata() {
  return { title: "Booking Details" };
}

/**
 * Booking Details Page — Milestone 18.0.
 *
 * Displays full booking information after reference + email verification.
 */
export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; reference: string }>;
}) {
  const { tenantSlug, reference } = await params;

  return (
    <BookingDetailsClientPage
      tenantSlug={tenantSlug}
      reference={reference}
    />
  );
}
