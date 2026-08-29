"use client";

/**
 * Animated Metric Card — premium KPI card with count-up animation.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import AnimatedCounter from "./AnimatedCounter";
import {
  dashboardColors,
  dashboardLayout,
  dashboardTypography,
  dashboardMotion,
} from "@/styles/theme/dashboard-tokens";
import type { ReactNode } from "react";

type Props = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: ReactNode;
  accentColor?: string;
  delay?: number;
};

export default function AnimatedMetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  trend,
  trendUp,
  icon,
  accentColor = dashboardColors.accent.primary,
  delay = 0,
}: Props) {
  return (
    <Box
      component={motion.div}
      initial={dashboardMotion.fadeUp.initial}
      animate={dashboardMotion.fadeUp.animate}
      transition={{ ...dashboardMotion.fadeUp.transition, delay }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      sx={{
        p: 2.5,
        borderRadius: `${dashboardLayout.borderRadius.md}px`,
        bgcolor: dashboardColors.bg.card,
        border: `1px solid ${dashboardColors.border.subtle}`,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        "&:hover": {
          borderColor: dashboardColors.border.hover,
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accentColor,
          opacity: 0.6,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography sx={dashboardTypography.metricLabel}>{label}</Typography>
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            sx={dashboardTypography.metricValue}
          />
          {trend && (
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                mt: 0.5,
                color: trendUp ? dashboardColors.status.success : dashboardColors.status.error,
              }}
            >
              {trend}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: `${dashboardLayout.borderRadius.sm}px`,
              bgcolor: `${accentColor}15`,
              color: accentColor,
              display: "flex",
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
