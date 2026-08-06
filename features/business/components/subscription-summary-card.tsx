import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import type { BusinessDashboardData } from "../services/get-business-dashboard";
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusColor,
} from "../utils/status-labels";
import { formatDashboardDate } from "../utils/format-date";

type SubscriptionSummaryCardProps = {
  subscription: BusinessDashboardData["subscription"];
  tenantSlug: string;
};

/**
 * Card displaying subscription status, plan, and key dates.
 */
export default function SubscriptionSummaryCard({
  subscription,
  tenantSlug,
}: SubscriptionSummaryCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Subscription
      </Typography>

      {subscription ? (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Chip
              label={getSubscriptionStatusLabel(subscription.status)}
              color={getSubscriptionStatusColor(subscription.status)}
              size="small"
            />
            {subscription.planName && (
              <Typography variant="body2" color="text.secondary">
                {subscription.planName}
                {subscription.billingInterval
                  ? ` (${subscription.billingInterval})`
                  : ""}
              </Typography>
            )}
          </Box>

          {subscription.trialEndsAt && (
            <Typography variant="body2" color="text.secondary">
              Trial ends {formatDashboardDate(subscription.trialEndsAt) ?? "—"}
            </Typography>
          )}

          {subscription.currentPeriodEndsAt &&
            subscription.status !== "trialing" && (
              <Typography variant="body2" color="text.secondary">
                {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                {formatDashboardDate(subscription.currentPeriodEndsAt) ?? "—"}
              </Typography>
            )}

          {subscription.cancelAtPeriodEnd && (
            <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
              Cancellation scheduled
            </Typography>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Subscription information is unavailable.
        </Typography>
      )}

      <Box sx={{ mt: 2 }}>
        <Link
          component={NextLink}
          href={`/${tenantSlug}/billing`}
          variant="body2"
        >
          Manage billing
        </Link>
      </Box>
    </Paper>
  );
}
