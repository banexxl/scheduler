"use client";

/**
 * Availability Ring — animated circular progress indicator.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { dashboardColors } from "@/styles/theme/dashboard-tokens";

type Props = {
  percentage: number;
  label?: string;
  size?: number;
};

export default function AvailabilityRing({ percentage, label = "Occupancy", size = 120 }: Props) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <Box sx={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={dashboardColors.border.subtle}
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={dashboardColors.accent.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${dashboardColors.accent.primary}40)` }}
        />
      </svg>
      <Box sx={{ position: "absolute", textAlign: "center" }}>
        <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: dashboardColors.text.primary }}>
          {percentage}%
        </Typography>
        <Typography sx={{ fontSize: "0.625rem", color: dashboardColors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
