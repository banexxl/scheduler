"use client";

/**
 * Portal Hero Section — Milestone 16.3.
 *
 * Displays the business logo, name, tagline, and primary CTA.
 * Uses tenant branding for all styling. Provides fallback behavior:
 * - Missing hero image → gradient background
 * - Missing logo → business initials
 * - Missing name → tenant name from context
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import { useTenantTheme } from "@/providers/tenant-theme-provider";

export default function PortalHero() {
  const { branding, tenant, portal } = useTenantTheme();

  const headline = portal.hero.headline || tenant.name;
  const subheadline =
    portal.hero.subheadline || portal.description || branding.tagline;
  const ctaLabel = portal.hero.ctaLabel;
  const logoUrl = branding.logoUrl;
  const coverUrl = branding.coverUrl;

  // Initials fallback for logo
  const initials = tenant.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Box
      component="section"
      aria-labelledby="portal-hero-heading"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: branding.primaryColor,
        color: "#fff",
        py: { xs: 6, md: 10 },
        px: { xs: 2, sm: 3 },
        textAlign: "center",
        // Cover image or gradient fallback
        ...(coverUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url(${coverUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.accentColor} 100%)`,
            }),
      }}
    >
      {/* Logo */}
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        {logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt={`${tenant.name} logo`}
            sx={{
              height: { xs: 56, md: 72 },
              maxWidth: 200,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
          />
        ) : (
          <Avatar
            sx={{
              width: { xs: 56, md: 72 },
              height: { xs: 56, md: 72 },
              bgcolor: "rgba(255,255,255,0.2)",
              color: "#fff",
              fontSize: { xs: "1.25rem", md: "1.5rem" },
              fontWeight: 700,
              backdropFilter: "blur(4px)",
            }}
            aria-hidden="true"
          >
            {initials}
          </Avatar>
        )}
      </Box>

      {/* Headline */}
      <Typography
        id="portal-hero-heading"
        component="h1"
        sx={{
          fontSize: { xs: "1.75rem", md: "2.5rem" },
          fontWeight: 800,
          mb: 1,
          maxWidth: 700,
          mx: "auto",
          textShadow: coverUrl ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {headline}
      </Typography>

      {/* Subheadline */}
      {subheadline && (
        <Typography
          sx={{
            fontSize: { xs: "0.9rem", md: "1.125rem" },
            opacity: 0.9,
            maxWidth: 600,
            mx: "auto",
            mb: 3,
            textShadow: coverUrl ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
          }}
        >
          {subheadline}
        </Typography>
      )}

      {/* CTA */}
      <Button
        href="#booking"
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
        {ctaLabel}
      </Button>
    </Box>
  );
}
