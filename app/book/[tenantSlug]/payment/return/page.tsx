import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Payment Return Route — Milestone 11.2.
 *
 * CRITICAL: This page does NOT prove payment succeeded.
 * It shows a "processing" state. Actual payment confirmation
 * happens only via trusted Polar webhook (Milestone 11.3).
 *
 * Reaching this URL manually never marks payment as paid.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment submitted",
  robots: { index: false, follow: false },
};

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const intentRef = query.ref ?? "";

  // Attempt to look up current payment state (read-only, no mutation)
  let paymentStatus: "processing" | "paid" | "failed" | "expired" = "processing";

  if (intentRef) {
    const supabase = createAdminClient();
    const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_intents" as never)
      .select("status" as never)
      .eq("id" as never, intentRef)
      .maybeSingle();

    if (data) {
      const status = (data as unknown as { status: string }).status;
      if (status === "succeeded") paymentStatus = "paid";
      else if (status === "failed") paymentStatus = "failed";
      else if (status === "expired") paymentStatus = "expired";
    }
  }

  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={2}
        sx={{ p: 4, maxWidth: 480, textAlign: "center", borderRadius: 3 }}
      >
        {paymentStatus === "paid" && (
          <>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Payment confirmed
            </Typography>
            <Alert severity="success" sx={{ mb: 2, justifyContent: "center" }}>
              Your payment was received successfully.
            </Alert>
          </>
        )}

        {paymentStatus === "processing" && (
          <>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Payment submitted
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We are confirming your payment. This usually takes only a moment.
              You will receive a confirmation email once complete.
            </Typography>
            <Alert severity="info" sx={{ mb: 2, justifyContent: "center" }}>
              Payment is being processed.
            </Alert>
          </>
        )}

        {paymentStatus === "failed" && (
          <>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Payment failed
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your payment could not be processed. Your appointment has not been charged.
              Please try again.
            </Typography>
            <Alert severity="error" sx={{ mb: 2, justifyContent: "center" }}>
              Payment was not successful.
            </Alert>
          </>
        )}

        {paymentStatus === "expired" && (
          <>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Payment expired
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The payment session has expired. Please start a new payment from your appointment.
            </Typography>
          </>
        )}

        <Button
          component="a"
          href={`/book/${tenantSlug}`}
          variant="outlined"
          sx={{ mt: 1 }}
        >
          Return to booking
        </Button>
      </Paper>
    </Box>
  );
}
