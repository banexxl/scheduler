"use client";

/**
 * Bold Template Shell — Milestone 16.2.
 *
 * Striking, full-width layout with a colored header band and
 * prominent use of the primary color. Good for businesses that
 * want a strong visual presence.
 */

import Box from "@mui/material/Box";
import type { TemplateShellProps } from "@/features/templates/types";

export default function BoldShell({ children }: TemplateShellProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* Colored header band */}
      <Box
        sx={{
          bgcolor: "primary.main",
          color: "primary.contrastText",
          py: { xs: 3, sm: 5 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto" }} />
      </Box>

      {/* Content area — full-width container */}
      <Box
        component="main"
        sx={{
          maxWidth: 1200,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          mt: { xs: -2, sm: -3 },
          position: "relative",
        }}
      >
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 2,
            p: { xs: 2, sm: 4 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
