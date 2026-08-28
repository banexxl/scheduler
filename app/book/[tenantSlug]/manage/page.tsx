import Box from "@mui/material/Box";
import BookingLookupForm from "@/features/booking-management/components/BookingLookupForm";

export async function generateMetadata() {
  return { title: "Manage Booking" };
}

/**
 * Booking Lookup Page — Milestone 18.0.
 *
 * Customer enters booking reference + email to find their appointment.
 */
export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <Box sx={{ py: { xs: 3, sm: 5 }, px: 2 }}>
      <BookingLookupForm tenantSlug={tenantSlug} />
    </Box>
  );
}
