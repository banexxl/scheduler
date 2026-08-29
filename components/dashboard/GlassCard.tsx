"use client";

/**
 * Glass Card — frosted glass card component.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import { dashboardColors, dashboardLayout, dashboardMotion } from "@/styles/theme/dashboard-tokens";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  sx?: object;
  hover?: boolean;
  delay?: number;
};

export default function GlassCard({ children, sx, hover = true, delay = 0 }: Props) {
  return (
    <Box
      component={motion.div}
      initial={dashboardMotion.fadeUp.initial}
      animate={dashboardMotion.fadeUp.animate}
      transition={{ ...dashboardMotion.fadeUp.transition, delay }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      sx={{
        p: 3,
        borderRadius: `${dashboardLayout.borderRadius.md}px`,
        bgcolor: dashboardColors.bg.glass,
        backdropFilter: "blur(12px)",
        border: `1px solid ${dashboardColors.border.subtle}`,
        background: dashboardColors.gradient.card,
        transition: "border-color 0.2s",
        "&:hover": hover ? { borderColor: dashboardColors.border.hover } : undefined,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
