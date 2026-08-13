import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { processUnsubscribeToken } from "@/features/campaigns/services/unsubscribe-token-service";

/**
 * Marketing Unsubscribe Page — Milestone 15.7.
 *
 * Processes the unsubscribe token and shows confirmation.
 * Secure, tokenized, idempotent, tenant-scoped.
 *
 * This route:
 * - Validates the hashed token
 * - Sets marketing_opt_in = false on the customer
 * - Shows a confirmation message
 * - Does NOT disable transactional/operational messages
 */
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { token } = await params;

  const result = await processUnsubscribeToken(decodeURIComponent(token));

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 3, bgcolor: "#fafafa" }}>
      <Stack spacing={2} sx={{ maxWidth: 480, textAlign: "center" }}>
        {result.success ? (
          <>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Unsubscribed
            </Typography>
            <Alert severity="success">
              You have been successfully unsubscribed from marketing emails.
            </Alert>
            <Typography sx={{ fontSize: "0.875rem", color: "#6b7280" }}>
              You will no longer receive promotional emails from this business.
              Transactional messages (appointment confirmations, reminders, receipts) will not be affected.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Unsubscribe
            </Typography>
            <Alert severity="warning">
              {result.reason === "token_expired"
                ? "This unsubscribe link has expired. Please contact the business directly."
                : "This unsubscribe link is invalid or has already been used."}
            </Alert>
            <Typography sx={{ fontSize: "0.875rem", color: "#6b7280" }}>
              If you believe this is an error, please contact the business directly to manage your communication preferences.
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
