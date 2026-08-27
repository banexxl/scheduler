"use client";

/**
 * Minimal Template Shell — Milestone 16.2.
 *
 * Clean, distraction-free layout. Content centered with comfortable
 * max-width. No decorative elements — lets the booking flow speak for itself.
 */

import Box from "@mui/material/Box";
import type { TemplateShellProps } from "@/features/templates/types";

export default function MinimalShell({ children }: TemplateShellProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <Box
        component="main"
        sx={{
          maxWidth: 960,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
