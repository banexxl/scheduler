"use client";

/**
 * Portal Hero — Premium dark with animated gradient orbs.
 *
 * Full-viewport hero with floating gradient orbs,
 * large logo, animated headline, and glowing CTA button.
 * Uses tenant branding colors for the gradient accent.
 */

import { motion } from "framer-motion";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import { useTenantTheme } from "@/providers/tenant-theme-provider";

const ORB_KEYFRAMES = `
@keyframes hero-orb-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(60px, -80px) scale(1.08); }
  50% { transform: translate(-40px, -140px) scale(0.95); }
  75% { transform: translate(80px, -50px) scale(1.04); }
}
@keyframes hero-orb-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-80px, 60px) scale(1.1); }
  66% { transform: translate(50px, 80px) scale(0.9); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-orb { animation: none !important; }
}
`;

export default function PortalHero() {
  const { branding, tenant, portal } = useTenantTheme();

  const headline = portal.hero.headline || tenant.name;
  const subheadline = portal.hero.subheadline || portal.description || branding.tagline;
  const ctaLabel = portal.hero.ctaLabel;
  const logoUrl = branding.logoUrl;
  const primaryColor = branding.primaryColor;
  const accentColor = branding.accentColor;

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
        bgcolor: "#0a0a0f",
        color: "#f0f0f5",
        py: { xs: 10, md: 16 },
        px: { xs: 2, sm: 3 },
        textAlign: "center",
        minHeight: { xs: "70vh", md: "80vh" },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{ORB_KEYFRAMES}</style>

      {/* Animated gradient orbs */}
      <Box
        className="hero-orb"
        sx={{
          position: "absolute",
          top: "15%",
          left: "10%",
          width: "clamp(250px, 35vw, 500px)",
          height: "clamp(250px, 35vw, 500px)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor}25 0%, ${primaryColor}08 40%, transparent 70%)`,
          filter: "blur(60px)",
          animation: "hero-orb-1 20s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <Box
        className="hero-orb"
        sx={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: "clamp(200px, 30vw, 400px)",
          height: "clamp(200px, 30vw, 400px)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}20 0%, ${accentColor}05 40%, transparent 70%)`,
          filter: "blur(50px)",
          animation: "hero-orb-2 25s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Subtle grid */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 700, mx: "auto" }}>
        {/* Logo */}
        <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: "easeOut" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            {logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt={`${tenant.name} logo`}
                sx={{
                  height: { xs: 64, md: 80 },
                  maxWidth: 200,
                  objectFit: "contain",
                  filter: `drop-shadow(0 0 24px ${primaryColor}50)`,
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: { xs: 64, md: 80 },
                  height: { xs: 64, md: 80 },
                  bgcolor: `${primaryColor}20`,
                  border: `2px solid ${primaryColor}40`,
                  color: primaryColor,
                  fontSize: { xs: "1.5rem", md: "2rem" },
                  fontWeight: 800,
                  boxShadow: `0 0 40px ${primaryColor}30`,
                }}
                aria-hidden="true"
              >
                {initials}
              </Avatar>
            )}
          </Box>
        </motion.div>

        {/* Headline */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}>
          <Typography
            id="portal-hero-heading"
            component="h1"
            sx={{
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3.25rem" },
              fontWeight: 800,
              mb: 1.5,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            {headline}
          </Typography>
        </motion.div>

        {/* Subheadline */}
        {subheadline && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
            <Typography
              sx={{
                fontSize: { xs: "1rem", md: "1.2rem" },
                color: "#8b8b9e",
                maxWidth: 560,
                mx: "auto",
                mb: 4,
                lineHeight: 1.7,
              }}
            >
              {subheadline}
            </Typography>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.5 }}>
          <Button
            href="#booking"
            variant="contained"
            size="large"
            sx={{
              fontWeight: 700,
              px: 5,
              py: 1.75,
              fontSize: "1rem",
              borderRadius: 2,
              textTransform: "none",
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              boxShadow: `0 0 40px ${primaryColor}40, 0 4px 20px rgba(0,0,0,0.3)`,
              "&:hover": {
                boxShadow: `0 0 60px ${primaryColor}60, 0 8px 30px rgba(0,0,0,0.4)`,
                transform: "translateY(-2px)",
              },
              transition: "all 0.3s ease",
            }}
          >
            {ctaLabel}
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{ marginTop: 48 }}
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <Box sx={{ width: 24, height: 40, borderRadius: 12, border: "2px solid rgba(255,255,255,0.12)", mx: "auto", display: "flex", justifyContent: "center", pt: 1 }}>
              <Box sx={{ width: 3, height: 8, borderRadius: 2, bgcolor: `${primaryColor}80` }} />
            </Box>
          </motion.div>
        </motion.div>
      </Box>
    </Box>
  );
}
