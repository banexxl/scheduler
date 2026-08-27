"use client";

/**
 * Elegant Template Shell — Milestones 16.2 + 16.3.
 *
 * Refined, symmetrical layout with portal shell components.
 * Subtle borders and generous whitespace for premium feel.
 *
 * Composition:
 *   Header → Hero → accent divider → main (880px) → divider → CTA → Footer
 */

import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import type { TemplateShellProps } from "@/features/templates/types";
import PortalHeader from "@/features/customer-portal/components/Header/PortalHeader";
import PortalHero from "@/features/customer-portal/components/Hero/PortalHero";
import PortalCTA from "@/features/customer-portal/components/CTA/PortalCTA";
import PortalFooter from "@/features/customer-portal/components/Footer/PortalFooter";

export default function ElegantShell({ children }: TemplateShellProps) {
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

      {/* Centered content with elegant spacing */}
      <Box
        component="main"
        sx={{
          maxWidth: 880,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 4 },
          py: { xs: 4, sm: 6 },
          flexGrow: 1,
        }}
      >
        <Divider sx={{ mb: { xs: 3, sm: 5 }, borderColor: "divider" }} />

        {children}

        <Divider sx={{ mt: { xs: 4, sm: 6 }, borderColor: "divider" }} />
      </Box>

      <PortalCTA />
      <PortalFooter />
    </Box>
  );
}
