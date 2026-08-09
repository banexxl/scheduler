"use client";

/**
 * Empty State — Milestone 10.4.
 *
 * Consistent empty state display for list surfaces.
 * Shows message with optional action CTA.
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 3, sm: 4 }, textAlign: "center", borderStyle: "dashed" }}
    >
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      {actionLabel && (actionHref || onAction) && (
        <Box>
          <Button
            variant="outlined"
            {...(actionHref ? { component: "a", href: actionHref } : {})}
            {...(onAction && !actionHref ? { onClick: onAction } : {})}
          >
            {actionLabel}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
