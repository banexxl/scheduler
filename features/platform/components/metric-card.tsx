import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { platformTypography, platformPalette, platformSurface } from "@/styles/theme/platform-admin-tokens";

/**
 * Metric Card — Milestone 14.1.
 *
 * Compact metric display for dashboard.
 * Accessible: always includes text label, not color-only.
 */

type MetricCardProps = {
  label: string;
  value: string | number;
  secondary?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
};

const VARIANT_COLORS: Record<string, { border: string; accent: string }> = {
  default: { border: platformPalette.page.surfaceBorder, accent: platformPalette.metric.primary },
  success: { border: platformPalette.status.success, accent: platformPalette.status.success },
  warning: { border: platformPalette.status.warning, accent: platformPalette.status.warning },
  error: { border: platformPalette.status.error, accent: platformPalette.status.error },
  info: { border: platformPalette.status.info, accent: platformPalette.status.info },
};

export default function MetricCard({
  label,
  value,
  secondary,
  variant = "default",
}: MetricCardProps) {
  const colors = VARIANT_COLORS[variant] ?? VARIANT_COLORS.default!;

  return (
    <Box
      sx={{
        p: 2,
        border: platformSurface.border,
        borderRadius: platformSurface.borderRadiusSm,
        borderLeft: `3px solid ${colors.border}`,
        bgcolor: platformPalette.page.surface,
        minWidth: 0,
      }}
    >
      <Typography sx={platformTypography.metricLabel}>{label}</Typography>
      <Typography sx={{ ...platformTypography.metricValue, color: colors.accent, mt: 0.5 }}>
        {String(value)}
      </Typography>
      {secondary && (
        <Typography sx={{ ...platformTypography.caption, mt: 0.25 }}>
          {secondary}
        </Typography>
      )}
    </Box>
  );
}
