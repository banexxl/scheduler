import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { resolveReviewToken } from "@/features/reviews/services/review-token-service";
import ReviewForm from "@/features/reviews/components/review-form";

/**
 * Public Review Submission Route — Milestone 8.7.
 *
 * Validates the review token server-side, then renders the form
 * or an appropriate error state.
 */
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;

  const context = await resolveReviewToken(token);

  // Invalid/expired/used token
  if (!context) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>Review Link Unavailable</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This review link is invalid or has expired.
          </Typography>
          <Button component="a" href={`/book/${tenantSlug}`} variant="outlined" size="small">
            Visit booking page
          </Button>
        </Paper>
      </Box>
    );
  }

  // Already reviewed
  if (context.hasExistingReview) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" gutterBottom>Already Submitted</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You have already submitted feedback for this appointment. Thank you!
          </Typography>
          <Button component="a" href={`/book/${tenantSlug}`} variant="outlined" size="small">
            Book another appointment
          </Button>
        </Paper>
      </Box>
    );
  }

  // Valid — show review form
  return (
    <ReviewForm
      token={token}
      tenantSlug={tenantSlug}
      tenantName={context.tenantName}
      serviceName={context.serviceName}
      appointmentDate={context.appointmentDate}
      customerName={context.customerName}
    />
  );
}
