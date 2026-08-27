"use client";

/**
 * Portal CTA — Milestone 16.3.
 *
 * Shared booking call-to-action shown at the bottom of every page.
 * Automatically themed with tenant branding.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useTenantTheme } from "@/providers/tenant-theme-provider";

export default function PortalCTA() {
  const { branding, tenant, portal } = useTenantTheme();

  return (
    <Box
      component="section"
      aria-label="Book an appointment"
      sx={{
        bgcolor: branding.primaryColor,
        color: "#fff",
        py: { xs: 5, md: 6 },
        px: { xs: 2, sm: 3 },
        textAlign: "center",
      }}
    >
      <Typography
        component="p"
        sx={{
          fontSize: { xs: "1.25rem", md: "1.5rem" },
          fontWeight: 700,
          mb: 2,
          maxWidth: 500,
          mx: "auto",
        }}
      >
        Ready to book your appointment?
      </Typography>

      <Button
        href={`/book/${tenant.slug}#booking`}
        variant="contained"
        size="large"
        sx={{
          bgcolor: "#fff",
          color: branding.primaryColor,
          fontWeight: 700,
          px: 4,
          py: 1.5,
          "&:hover": { bgcolor: "#f0f0f0" },
          borderRadius: `${branding.borderRadius}px`,
          textTransform: "none",
        }}
      >
        {portal.hero.ctaLabel}
      </Button>
    </Box>
  );
}
