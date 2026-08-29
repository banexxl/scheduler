"use client";

/**
 * Minimal Template Shell — Milestones 16.2 + 16.3.
 *
 * Clean, distraction-free layout with portal shell components.
 * Content centered with comfortable max-width.
 *
 * Composition:
 *   Header → Hero → main (centered 960px) → CTA → Footer
 */

import Box from "@mui/material/Box";
import type { TemplateShellProps } from "@/features/templates/types";
import PortalHeader from "@/features/customer-portal/components/Header/PortalHeader";
import PortalHero from "@/features/customer-portal/components/Hero/PortalHero";
import PortalCTA from "@/features/customer-portal/components/CTA/PortalCTA";
import PortalFooter from "@/features/customer-portal/components/Footer/PortalFooter";
import { useIsBookingStep } from "../use-is-booking-step";

export default function MinimalShell({ children }: TemplateShellProps) {
  const isStep = useIsBookingStep();

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
      {!isStep && <PortalHero />}

      <Box
        component="main"
        sx={{
          maxWidth: 960,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
          flexGrow: 1,
        }}
      >
        {children}
      </Box>

      {!isStep && <PortalCTA />}
      <PortalFooter />
    </Box>
  );
}
