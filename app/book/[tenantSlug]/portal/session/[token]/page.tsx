import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { consumePortalAccessToken } from "@/features/customer-portal/services/portal-token-service";
import { setPortalSessionCookie } from "@/features/customer-portal/services/portal-session-cookies";

/**
 * Portal Token Consumption — Milestone 8.6.
 *
 * Consumes a magic-link token, creates a session, sets the cookie,
 * and redirects to the portal dashboard.
 *
 * On failure: shows a generic error (no distinction between
 * invalid/expired/used for security).
 */
export default async function PortalSessionTokenPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;

  const result = await consumePortalAccessToken(token);

  if (result.success) {
    // Set session cookie and redirect to portal
    await setPortalSessionCookie(tenantSlug, result.session.rawSessionToken);
    redirect(`/book/${tenantSlug}/portal`);
  }

  // Token invalid/expired/used — show generic error
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom>
          Access Link Unavailable
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This access link is invalid or has expired. Please request a new one.
        </Typography>
        <Button
          component="a"
          href={`/book/${tenantSlug}/portal`}
          variant="contained"
          size="small"
        >
          Request new link
        </Button>
      </Paper>
    </Box>
  );
}
