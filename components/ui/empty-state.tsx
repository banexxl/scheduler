"use client";

/**
 * Empty State — Premium Dark Theme.
 *
 * Beautiful empty state with centered icon, title, description, and CTA.
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import InboxIcon from "@mui/icons-material/InboxOutlined";

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
    <Box
      sx={{
        p: { xs: 4, sm: 6 },
        textAlign: "center",
        borderRadius: "16px",
        border: "1px dashed rgba(255, 255, 255, 0.08)",
        bgcolor: "rgba(22, 22, 30, 0.5)",
      }}
    >
      <InboxIcon sx={{ fontSize: 48, color: "rgba(139, 139, 158, 0.4)", mb: 2 }} />
      <Typography variant="h6" sx={{ color: "#f0f0f5", fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: "0.875rem", color: "#8b8b9e", mb: 3, maxWidth: 360, mx: "auto" }}>
          {description}
        </Typography>
      )}
      {actionLabel && (actionHref || onAction) && (
        <Button
          variant="outlined"
          sx={{
            borderColor: "rgba(124, 58, 237, 0.3)",
            color: "#8B5CF6",
            "&:hover": { borderColor: "#7C3AED", bgcolor: "rgba(124, 58, 237, 0.08)" },
          }}
          {...(actionHref ? { component: "a", href: actionHref } : {})}
          {...(onAction && !actionHref ? { onClick: onAction } : {})}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
