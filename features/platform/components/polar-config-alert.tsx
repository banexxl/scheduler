import Alert from "@mui/material/Alert";
import { getBillingDiagnosticsConfig } from "@/features/platform/services/polar-config";

/**
 * Polar Config Alert — Milestone 15.13.
 *
 * Shows Polar integration status. Green when all configured,
 * yellow/red when something is missing.
 * Reusable across all platform billing pages.
 */
export default function PolarConfigAlert() {
  const diagnostics = getBillingDiagnosticsConfig();

  const allGood = diagnostics.hasAccessToken && diagnostics.hasWebhookSecret;
  const severity = allGood ? "success" : diagnostics.hasAccessToken ? "warning" : "error";

  return (
    <Alert severity={severity} variant="outlined" sx={{ fontSize: "0.75rem" }}>
      Polar API: {diagnostics.apiBaseUrl} ({diagnostics.server})
      {" | "}Access token: {diagnostics.hasAccessToken ? "configured" : "missing"}
      {" | "}Webhook secrets: {diagnostics.hasWebhookSecret ? "configured" : "missing"}
      {diagnostics.hasOrganizationId && <>{" | "}Org ID: configured</>}
    </Alert>
  );
}
