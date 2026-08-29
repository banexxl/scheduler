"use client";

/**
 * Minimal Template Shell — Premium dark redesign.
 *
 * Dark background with smooth scroll behavior.
 * Composition: Header → Hero → main → CTA → Footer
 * Hero and CTA hidden on booking step sub-routes.
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
        bgcolor: "#0a0a0f",
        color: "#f0f0f5",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`html { scroll-behavior: smooth; }`}</style>

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
