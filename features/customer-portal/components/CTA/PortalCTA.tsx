"use client";

/**
 * Portal CTA — Premium dark with glow effect.
 *
 * Booking call-to-action section with gradient button and subtle glow.
 * Uses tenant branding for accent colors.
 */

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useTenantTheme } from "@/providers/tenant-theme-provider";

export default function PortalCTA() {
  const { branding, tenant, portal } = useTenantTheme();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const primaryColor = branding.primaryColor;
  const accentColor = branding.accentColor;

  return (
    <Box
      component="section"
      aria-label="Book an appointment"
      ref={ref}
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: "#0a0a0f",
        py: { xs: 10, md: 14 },
        px: { xs: 2, sm: 3 },
        textAlign: "center",
      }}
    >
      {/* Glow orb */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "clamp(300px, 50vw, 600px)",
          height: "clamp(300px, 50vw, 600px)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${primaryColor}12 0%, transparent 70%)`,
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 500, mx: "auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Typography
            component="p"
            sx={{
              fontSize: { xs: "1.5rem", md: "2rem" },
              fontWeight: 800,
              mb: 1.5,
              color: "#f0f0f5",
              letterSpacing: "-0.02em",
            }}
          >
            Ready to book?
          </Typography>
          <Typography
            sx={{
              fontSize: "1rem",
              color: "#8b8b9e",
              mb: 4,
              lineHeight: 1.6,
            }}
          >
            Schedule your appointment with {tenant.name} in just a few clicks.
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Button
            href={`/book/${tenant.slug}#booking`}
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
            {portal.hero.ctaLabel}
          </Button>
        </motion.div>
      </Box>
    </Box>
  );
}
