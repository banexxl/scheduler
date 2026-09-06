"use client";

/**
 * Portal Header — Premium dark glassmorphism.
 *
 * Sticky header that transitions from transparent to frosted glass on scroll.
 * Uses tenant branding for primary color accents.
 */

import { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import MenuIcon from "@mui/icons-material/Menu";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import { usePortalAuth } from "../portal-auth-provider";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";
import MobileNavigation from "../MobileNavigation/MobileNavigation";

export default function PortalHeader() {
  const { branding, tenant } = useTenantTheme();
  const { items, tenantSlug, homeHref } = usePortalNavigation();
  const { isLoggedIn } = usePortalAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const logoUrl = branding.logoUrl;
  const initials = tenant.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const primaryColor = branding.primaryColor;

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: scrolled ? "rgba(10, 10, 15, 0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? `1px solid rgba(255,255,255,0.06)` : "1px solid transparent",
          transition: "background-color 0.3s, border-color 0.3s, backdrop-filter 0.3s",
          color: "#f0f0f5",
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
            px: { xs: 1.5, sm: 2 },
          }}
        >
          {/* Mobile hamburger */}
          <IconButton
            edge="start"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "flex", md: "none" }, mr: 1, color: "#a0a0b8" }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo / Brand */}
          <Box
            component="a"
            href={homeHref}
            sx={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "#f0f0f5",
              mr: 3,
              flexShrink: 0,
              gap: 1,
            }}
          >
            {logoUrl ? (
              <Box
                sx={{
                  position: "relative",
                  display: "inline-flex",
                  p: 0.5,
                  borderRadius: "12px",
                  border: `2px solid ${primaryColor}`,
                  boxShadow: `0 0 0 1.5px rgba(255,255,255,0.85) inset, 0 0 12px ${primaryColor}70, 0 2px 8px rgba(0,0,0,0.3)`,
                  bgcolor: "rgba(255,255,255,0.9)",
                  overflow: "hidden",
                }}
              >
                <Box
                  component="img"
                  src={logoUrl}
                  alt={`${tenant.name} logo`}
                  sx={{ height: 36, maxWidth: 120, objectFit: "contain", display: "block", borderRadius: "8px" }}
                />
                {/* Primary color tint over the logo so it always picks up
                    some brand color regardless of its own hue */}
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "12px",
                    backgroundColor: primaryColor,
                    opacity: 0.28,
                    mixBlendMode: "color",
                    pointerEvents: "none",
                  }}
                />
              </Box>
            ) : (
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: primaryColor,
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  boxShadow: `0 0 12px ${primaryColor}40`,
                }}
                aria-hidden="true"
              >
                {initials}
              </Avatar>
            )}
          </Box>

          {/* Desktop nav links */}
          <Box
            component="nav"
            aria-label="Main navigation"
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 0.5,
              flexGrow: 1,
            }}
          >
            {items.map((item) => (
              <Button
                key={item.href}
                href={item.href}
                size="small"
                sx={{
                  color: item.active ? "#f0f0f5" : "#8b8b9e",
                  fontWeight: item.active ? 700 : 500,
                  textTransform: "none",
                  minWidth: "auto",
                  px: 1.5,
                  fontSize: "0.875rem",
                  borderBottom: item.active ? `2px solid ${primaryColor}` : "2px solid transparent",
                  borderRadius: 0,
                  "&:hover": { color: "#f0f0f5", bgcolor: "rgba(255,255,255,0.04)" },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Auth + Book buttons */}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            {!isLoggedIn && (
              <Button
                href={`/book/${tenantSlug}/login`}
                size="small"
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  color: "#a0a0b8",
                  display: { xs: "none", sm: "inline-flex" },
                  "&:hover": { color: "#f0f0f5" },
                }}
              >
                Sign In
              </Button>
            )}
            {/* Book an appointment — takes the customer to the booking wizard. */}
            <Button
              href={`/book/${tenantSlug}#booking`}
              variant="contained"
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                display: { xs: "none", sm: "inline-flex" },
                background: `linear-gradient(135deg, ${primaryColor}, ${branding.accentColor})`,
                boxShadow: `0 0 20px ${primaryColor}30`,
                "&:hover": {
                  boxShadow: `0 0 30px ${primaryColor}50`,
                },
              }}
            >
              Book
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <MobileNavigation
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}
