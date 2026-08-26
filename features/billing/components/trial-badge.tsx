"use client";

/**
 * Trial Badge — shows remaining trial days in the dashboard.
 *
 * Displays:
 * - Green: "14 days left" (plenty of time)
 * - Yellow: "3 days left" (urgent)
 * - Red: "Trial expired"
 * - Hidden: if on active subscription (no trial badge needed)
 */

import Chip from "@mui/material/Chip";

type Props = {
  trialDaysRemaining: number | null;
  subscriptionStatus: string | null;
};

export default function TrialBadge({ trialDaysRemaining, subscriptionStatus }: Props) {
  // Don't show badge if on active subscription
  if (subscriptionStatus === "active") return null;

  // No trial info
  if (trialDaysRemaining === null) return null;

  if (trialDaysRemaining <= 0) {
    return <Chip label="Trial expired" size="small" color="error" variant="outlined" />;
  }

  if (trialDaysRemaining <= 3) {
    return (
      <Chip
        label={`${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left`}
        size="small"
        color="warning"
        variant="outlined"
      />
    );
  }

  return (
    <Chip
      label={`${trialDaysRemaining} days left in trial`}
      size="small"
      color="success"
      variant="outlined"
    />
  );
}
