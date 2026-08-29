"use client";

/**
 * Dashboard Shell — dark background wrapper for premium dashboards.
 * Wraps the content area (not the sidebar/shell layout).
 */

import Box from "@mui/material/Box";
import { dashboardColors } from "@/styles/theme/dashboard-tokens";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function DashboardShell({ children }: Props) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: dashboardColors.bg.primary,
        color: dashboardColors.text.primary,
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        {children}
      </Box>
    </Box>
  );
}
