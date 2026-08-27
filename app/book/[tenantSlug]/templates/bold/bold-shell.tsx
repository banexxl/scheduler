"use client";

/**
 * Bold Template Shell — Milestones 16.2 + 16.3.
 *
 * Striking, full-width layout with portal shell components.
 * Content in an elevated card container for strong visual presence.
 *
 * Composition:
 *   Header → Hero → main (card at 1200px) → CTA → Footer
 */

import Box from "@mui/material/Box";
import type { TemplateShellProps } from "@/features/templates/types";
import PortalHeader from "@/features/customer-portal/components/Header/PortalHeader";
import PortalHero from "@/features/customer-portal/components/Hero/PortalHero";
import PortalCTA from "@/features/customer-portal/components/CTA/PortalCTA";
import PortalFooter from "@/features/customer-portal/components/Footer/PortalFooter";

export default function BoldShell({ children }: TemplateShellProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PortalHeader />
      <PortalHero />

      {/* Content in elevated card */}
      <Box
        component="main"
        sx={{
          maxWidth: 1200,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          mt: { xs: -2, sm: -3 },
          position: "relative",
          flexGrow: 1,
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

      <PortalCTA />
      <PortalFooter />
    </Box>
  );
}
