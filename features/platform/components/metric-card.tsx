import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { platformTypography, platformPalette, platformSurface } from "@/styles/theme/platform-admin-tokens";

/**
 * Metric Card — Premium Dark Theme.
 */

type MetricCardProps = {
  label: string;
  value: string | number;
  secondary?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
};

const VARIANT_COLORS: Record<string, { border: string; accent: string }> = {
  default: { border: "rgba(255, 255, 255, 0.08)", accent: platformPalette.metric.primary },
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
        borderRadius: `12px`,
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
        <Typography sx={{ ...platformTypography.caption, mt: 0.5 }}>
          {secondary}
        </Typography>
      )}
    </Box>
  );
}
