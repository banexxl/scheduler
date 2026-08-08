import { createHash } from "crypto";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicTenant } from "@/features/public-booking/services/public-tenant-resolver";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Public Waitlist Offer Page — Milestone 8.8.
 *
 * Validates the offer token, shows slot details, and links to booking.
 * Does NOT directly book — redirects to the public booking flow.
 */
export default async function WaitlistOfferPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;

  const tenant = await resolvePublicTenant(tenantSlug);
  if (!tenant) {
    return <OfferError tenantSlug={tenantSlug} message="Business not found." />;
  }

  // Resolve offer by token hash
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const supabase = createAdminClient();

  const { data: offerRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("waitlist_offers" as never)
    .select("id, tenant_id, service_id, location_id, resource_id, starts_at, ends_at, status, expires_at" as never)
    .eq("token_hash" as never, tokenHash)
    .single();

  if (!offerRow) {
    return <OfferError tenantSlug={tenantSlug} message="This offer link is invalid or has expired." />;
  }

  const offer = offerRow as unknown as {
    id: string; tenant_id: string; service_id: string; location_id: string;
    resource_id: string; starts_at: string; ends_at: string; status: string; expires_at: string;
  };

  if (offer.tenant_id !== tenant.id) {
    return <OfferError tenantSlug={tenantSlug} message="This offer link is invalid." />;
  }

  if (offer.status === "expired" || offer.status === "cancelled" || offer.status === "stale") {
    return <OfferError tenantSlug={tenantSlug} message="This offer has expired. The slot may no longer be available." />;
  }

  if (offer.status === "accepted") {
    return <OfferError tenantSlug={tenantSlug} message="This offer has already been used." />;
  }

  if (new Date(offer.expires_at) <= new Date()) {
    return <OfferError tenantSlug={tenantSlug} message="This offer has expired." />;
  }

  // Load names for display
  const [serviceRow, locationRow, resourceRow] = await Promise.all([
    (supabase as never as ReturnType<typeof createAdminClient>).from("services" as never).select("name" as never).eq("id" as never, offer.service_id).single(),
    (supabase as never as ReturnType<typeof createAdminClient>).from("locations" as never).select("name" as never).eq("id" as never, offer.location_id).single(),
    (supabase as never as ReturnType<typeof createAdminClient>).from("resources" as never).select("name" as never).eq("id" as never, offer.resource_id).single(),
  ]);

  const serviceName = (serviceRow.data as unknown as { name: string } | null)?.name ?? "Service";
  const locationName = (locationRow.data as unknown as { name: string } | null)?.name ?? "Location";
  const resourceName = (resourceRow.data as unknown as { name: string } | null)?.name ?? "Available";

  const appointmentDate = formatInTimeZone(offer.starts_at, tenant.defaultTimeZone, "EEEE, MMMM d, yyyy");
  const appointmentTime = formatInTimeZone(offer.starts_at, tenant.defaultTimeZone, "h:mm a");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 480, width: "100%", textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {tenant.name}
        </Typography>
        <Typography variant="h6" sx={{ mb: 2 }}>
          A time opened up!
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, mb: 3, textAlign: "left" }}>
          <Typography variant="body2"><strong>Service:</strong> {serviceName}</Typography>
          <Typography variant="body2"><strong>Date:</strong> {appointmentDate}</Typography>
          <Typography variant="body2"><strong>Time:</strong> {appointmentTime}</Typography>
          <Typography variant="body2"><strong>Location:</strong> {locationName}</Typography>
          <Typography variant="body2"><strong>With:</strong> {resourceName}</Typography>
        </Paper>

        <Alert severity="info" variant="outlined" sx={{ mb: 2, textAlign: "left" }}>
          This slot is not reserved. Book promptly to secure it.
        </Alert>

        <Button
          component="a"
          href={`/book/${tenantSlug}`}
          variant="contained"
          size="large"
          fullWidth
        >
          Book This Time
        </Button>

        <Button
          component="a"
          href={`/book/${tenantSlug}`}
          variant="text"
          size="small"
          sx={{ mt: 1 }}
        >
          View all available times
        </Button>
      </Paper>
    </Box>
  );
}

function OfferError({ tenantSlug, message }: { tenantSlug: string; message: string }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>Offer Unavailable</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        <Button component="a" href={`/book/${tenantSlug}`} variant="outlined" size="small">
          View available times
        </Button>
      </Paper>
    </Box>
  );
}
