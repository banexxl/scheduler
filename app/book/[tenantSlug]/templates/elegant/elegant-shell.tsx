"use client";

/**
 * Elegant Template Shell — Milestone 16.2.
 *
 * Refined, symmetrical layout with subtle borders and generous
 * whitespace. Suited for premium or professional services.
 */

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import type { TemplateShellProps } from "@/features/templates/types";

export default function ElegantShell({ children }: TemplateShellProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Top accent line */}
      <Box sx={{ height: 4, bgcolor: "primary.main" }} />

      {/* Centered content with elegant spacing */}
      <Box
        component="main"
        sx={{
          maxWidth: 880,
          mx: "auto",
          px: { xs: 2, sm: 4 },
          py: { xs: 4, sm: 6 },
        }}
      >
        <Divider sx={{ mb: { xs: 3, sm: 5 }, borderColor: "divider" }} />

        {children}

        <Divider sx={{ mt: { xs: 4, sm: 6 }, borderColor: "divider" }} />

        <Box
          component="footer"
          sx={{
            mt: 3,
            textAlign: "center",
            color: "text.secondary",
            fontSize: "0.75rem",
          }}
        />
      </Box>
    </Box>
  );
}
