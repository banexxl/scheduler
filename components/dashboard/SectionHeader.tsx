"use client";

/**
 * Section Header — premium section title with optional action.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { dashboardTypography, dashboardMotion } from "@/styles/theme/dashboard-tokens";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  delay?: number;
};

export default function SectionHeader({ title, subtitle, action, delay = 0 }: Props) {
  return (
    <Box
      component={motion.div}
      initial={dashboardMotion.fadeUp.initial}
      animate={dashboardMotion.fadeUp.animate}
      transition={{ ...dashboardMotion.fadeUp.transition, delay }}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2.5,
      }}
    >
      <Box>
        <Typography sx={dashboardTypography.sectionTitle}>{title}</Typography>
        {subtitle && (
          <Typography sx={{ ...dashboardTypography.caption, mt: 0.25 }}>{subtitle}</Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
