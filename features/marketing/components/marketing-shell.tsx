"use client";

/**
 * Marketing Shell — Premium dark SaaS layout.
 *
 * - Glassmorphism sticky header that becomes more opaque on scroll
 * - Smooth scroll behavior
 * - Dark footer with gradient accent
 * - Auth-aware navigation
 */

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { logoutAction } from "@/features/auth/actions/logout";

type Props = {
  children: React.ReactNode;
  userEmail: string | null;
};

const NAV_LINKS = [
  { label: "Features", href: "/#features", sectionId: "features" },
  { label: "How It Works", href: "/#how-it-works", sectionId: "how-it-works" },
  { label: "Pricing", href: "/#pricing", sectionId: "pricing" },
];

export default function MarketingShell({ children, userEmail }: Props) {
  const isLoggedIn = Boolean(userEmail);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { scrollY } = useScroll();
  const headerBg = useTransform(
    scrollY,
    [0, 80],
    ["rgba(10, 10, 15, 0)", "rgba(10, 10, 15, 0.85)"]
  );
  const headerBorder = useTransform(
    scrollY,
    [0, 80],
    ["rgba(124, 58, 237, 0)", "rgba(124, 58, 237, 0.15)"]
  );

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Scroll-spy: track which section is currently in view
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.sectionId);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveSection(visible[0]!.target.id);
        } else {
          // If nothing is intersecting, check if we scrolled past all sections
          const allAbove = elements.every(
            (el) => el.getBoundingClientRect().bottom < 0
          );
          if (allAbove) {
            setActiveSection(sectionIds[sectionIds.length - 1] ?? null);
          } else {
            setActiveSection(null);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : "?";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "#0a0a0f", color: "#f0f0f5" }}>
      {/* Smooth scroll */}
      <style>{`html { scroll-behavior: smooth; }`}</style>

      {/* Header */}
      <motion.header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          backgroundColor: headerBg as unknown as string,
          borderBottom: `1px solid`,
          borderColor: headerBorder as unknown as string,
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          transition: "backdrop-filter 0.3s",
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/getslot_icon.svg" alt="" width={36} height={36} style={{ filter: "drop-shadow(0 0 8px rgba(124,58,237,0.4))" }} />
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #7C3AED, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.02em",
                }}
              >
                Get Slot
              </Typography>
            </Link>

            <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
              {/* Nav links — desktop */}
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
                {NAV_LINKS.map((link) => {
                  const isActive = activeSection === link.sectionId;
                  return (
                    <Button
                      key={link.href}
                      href={link.href}
                      size="small"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#a78bfa" : "#a0a0b8",
                        fontSize: "0.875rem",
                        textTransform: "none",
                        position: "relative",
                        transition: "color 0.3s",
                        "&:hover": { color: "#f0f0f5", bgcolor: "rgba(255,255,255,0.05)" },
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          bottom: 2,
                          left: "20%",
                          right: "20%",
                          height: 2,
                          borderRadius: 1,
                          bgcolor: "#7C3AED",
                          transform: isActive ? "scaleX(1)" : "scaleX(0)",
                          transition: "transform 0.3s ease",
                        },
                      }}
                    >
                      {link.label}
                    </Button>
                  );
                })}
              </Box>

              {isLoggedIn ? (
                <>
                  <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size="small"
                    aria-label="Account menu"
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: "#7C3AED", fontWeight: 700 }}>
                      {initials}
                    </Avatar>
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={() => setAnchorEl(null)}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1,
                          minWidth: 220,
                          borderRadius: 2,
                          bgcolor: "#16161e",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#f0f0f5",
                          "& .MuiMenuItem-root:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                        },
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>Account</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#8b8b9e" }}>{userEmail}</Typography>
                    </Box>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                    <MenuItem component="a" href="/api/home" onClick={() => setAnchorEl(null)}>
                      <ListItemText primary="Dashboard" primaryTypographyProps={{ fontSize: "0.8125rem" }} />
                    </MenuItem>
                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
                    <form action={logoutAction} style={{ margin: 0 }}>
                      <MenuItem component="button" type="submit" onClick={() => setAnchorEl(null)} sx={{ width: "100%" }}>
                        <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: "0.8125rem", color: "#EF4444" }} />
                      </MenuItem>
                    </form>
                  </Menu>
                </>
              ) : (
                <>
                  <Button
                    href="/login"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      color: "#a0a0b8",
                      textTransform: "none",
                      "&:hover": { color: "#f0f0f5" },
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    href="/register"
                    variant="contained"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 2.5,
                      textTransform: "none",
                      background: "linear-gradient(135deg, #7C3AED, #a855f7)",
                      boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #6D28D9, #9333ea)",
                        boxShadow: "0 0 30px rgba(124,58,237,0.5)",
                      },
                    }}
                  >
                    Start Free
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Container>
      </motion.header>

      {/* Content */}
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(180deg, #0a0a0f 0%, #0d0d14 100%)",
        }}
      >
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/getslot_icon.svg" alt="" width={28} height={28} style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.3))" }} />
              <Typography
                sx={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #7C3AED, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Get Slot
              </Typography>
              <Typography component="span" sx={{ fontSize: "0.75rem", color: "#5c5c72" }}>
                &copy; {new Date().getFullYear()} All rights reserved.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3}>
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} style={{ fontSize: "0.75rem", color: "#5c5c72", textDecoration: "none" }}>
                  {link.label}
                </Link>
              ))}
              <Link href="/login" style={{ fontSize: "0.75rem", color: "#5c5c72", textDecoration: "none" }}>
                Sign In
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
