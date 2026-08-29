"use client";

/**
 * Dashboard Header — hero section with welcome, date, and optional actions.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { dashboardTypography, dashboardColors, dashboardMotion } from "@/styles/theme/dashboard-tokens";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  date?: string;
  actions?: ReactNode;
};

export default function DashboardHeader({ title, subtitle, date, actions }: Props) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      sx={{ mb: 4 }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
      >
        <Box>
          <Typography sx={dashboardTypography.hero}>{title}</Typography>
          {subtitle && (
            <Typography sx={{ ...dashboardTypography.body, mt: 0.5 }}>{subtitle}</Typography>
          )}
          {date && (
            <Typography sx={{ ...dashboardTypography.caption, mt: 0.5 }}>{date}</Typography>
          )}
        </Box>
        {actions && <Stack direction="row" spacing={1.5}>{actions}</Stack>}
      </Stack>
    </Box>
  );
}
