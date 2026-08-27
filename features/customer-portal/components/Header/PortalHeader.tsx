"use client";

/**
 * Portal Header — Milestone 16.3.
 *
 * Sticky responsive header with logo, navigation links (desktop),
 * and hamburger menu trigger (mobile).
 * Gains elevation on scroll.
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
import { usePortalNavigation } from "../../hooks/usePortalNavigation";
import MobileNavigation from "../MobileNavigation/MobileNavigation";

export default function PortalHeader() {
  const { branding, tenant } = useTenantTheme();
  const { items, tenantSlug } = usePortalNavigation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Elevation on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
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

  return (
    <>
      <AppBar
        position="sticky"
        elevation={scrolled ? 2 : 0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: scrolled ? "none" : 1,
          borderColor: "divider",
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1200,
            width: "100%",
            mx: "auto",
            px: { xs: 1, sm: 2 },
          }}
        >
          {/* Mobile hamburger */}
          <IconButton
            edge="start"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: "flex", md: "none" }, mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo / Brand */}
          <Box
            component="a"
            href={`/book/${tenantSlug}`}
            sx={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
              mr: 3,
              flexShrink: 0,
            }}
          >
            {logoUrl ? (
              <Box
                component="img"
                src={logoUrl}
                alt={`${tenant.name} logo`}
                sx={{ height: 36, maxWidth: 120, objectFit: "contain" }}
              />
            ) : (
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: branding.primaryColor,
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 700,
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
                  color: item.active ? "primary.main" : "text.primary",
                  fontWeight: item.active ? 700 : 500,
                  textTransform: "none",
                  minWidth: "auto",
                  px: 1.5,
                  borderBottom: item.active ? 2 : 0,
                  borderColor: "primary.main",
                  borderRadius: 0,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Book button */}
          <Button
            href={`/book/${tenantSlug}#booking`}
            variant="contained"
            size="small"
            sx={{
              ml: "auto",
              textTransform: "none",
              fontWeight: 600,
              display: { xs: "none", sm: "inline-flex" },
            }}
          >
            Book
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <MobileNavigation
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}
