import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { platformTypography, platformPalette } from "@/styles/theme/platform-admin-tokens";

/**
 * Platform Empty State — Milestone 14.1.
 */

type PlatformEmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function PlatformEmptyState({
  title,
  description,
  action,
}: PlatformEmptyStateProps) {
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: "center",
        bgcolor: platformPalette.page.surfaceHover,
        borderRadius: 2,
      }}
    >
      <Typography sx={{ ...platformTypography.sectionTitle, color: "#f0f0f5" }}>
        {title}
      </Typography>
      {description && (
        <Typography sx={{ ...platformTypography.secondary, mt: 1, maxWidth: 400, mx: "auto" }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}
