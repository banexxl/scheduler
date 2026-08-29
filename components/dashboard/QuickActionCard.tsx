"use client";

/**
 * Quick Action Card — hoverable action card for dashboards.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { dashboardColors, dashboardLayout, dashboardMotion } from "@/styles/theme/dashboard-tokens";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  delay?: number;
};

export default function QuickActionCard({ title, description, icon, href, delay = 0 }: Props) {
  return (
    <Box
      component={motion.a}
      href={href}
      initial={dashboardMotion.fadeUp.initial}
      animate={dashboardMotion.fadeUp.animate}
      transition={{ ...dashboardMotion.fadeUp.transition, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      sx={{
        display: "block",
        p: 2.5,
        borderRadius: `${dashboardLayout.borderRadius.md}px`,
        bgcolor: dashboardColors.bg.card,
        border: `1px solid ${dashboardColors.border.subtle}`,
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        "&:hover": {
          borderColor: dashboardColors.accent.primaryBorder,
          boxShadow: `0 4px 20px ${dashboardColors.accent.primaryGlow}`,
        },
      }}
    >
      <Box sx={{ color: dashboardColors.accent.primaryLight, mb: 1.5 }}>{icon}</Box>
      <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: dashboardColors.text.primary }}>{title}</Typography>
      <Typography sx={{ fontSize: "0.75rem", color: dashboardColors.text.muted, mt: 0.25 }}>{description}</Typography>
    </Box>
  );
}
