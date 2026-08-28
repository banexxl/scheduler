import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export async function generateMetadata() {
  return { title: "Booking Confirmed" };
}

/**
 * Booking Confirmation Page — Milestone 17.2.
 *
 * Server component shell — the actual confirmation data
 * is loaded from sessionStorage by the client component.
 */
export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return <ConfirmClientWrapper tenantSlug={tenantSlug} />;
}

// Need a separate client component since we read sessionStorage
import ConfirmClientWrapper from "./client-page";
