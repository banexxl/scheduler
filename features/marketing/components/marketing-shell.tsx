"use client";

/**
 * Marketing Shell — shared layout wrapper for all marketing pages.
 *
 * - Sticky header with logo and auth-aware nav
 * - Clean background
 * - Footer
 */

import { useState } from "react";
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
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
import { logoutAction } from "@/features/auth/actions/logout";

type Props = {
  children: React.ReactNode;
  userEmail: string | null;
};

export default function MarketingShell({ children, userEmail }: Props) {
  const isLoggedIn = Boolean(userEmail);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : "?";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "#f8fafc" }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          bgcolor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1.5 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.02em" }}>
                get-slot
              </Typography>
            </Link>

            <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
              {/* Nav links — hidden on mobile */}
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.5 }}>
                <Button href="/pricing" size="small" sx={{ fontWeight: 500, color: "#4b5563" }}>
                  Pricing
                </Button>
                <Button href="/features" size="small" sx={{ fontWeight: 500, color: "#4b5563" }}>
                  Features
                </Button>
              </Box>

              {isLoggedIn ? (
                <>
                  <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size="small"
                    aria-label="Account menu"
                    aria-controls={menuOpen ? "account-menu" : undefined}
                    aria-haspopup="true"
                    aria-expanded={menuOpen ? "true" : undefined}
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: "0.875rem", bgcolor: "#667eea", fontWeight: 700 }}>
                      {initials}
                    </Avatar>
                  </IconButton>
                  <Menu
                    id="account-menu"
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={() => setAnchorEl(null)}
                    transformOrigin={{ horizontal: "right", vertical: "top" }}
                    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } } }}
                  >
                    <Box sx={{ px: 2, py: 1.5 }}>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>Account</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>{userEmail}</Typography>
                    </Box>
                    <Divider />
                    <MenuItem component="a" href="/api/home" onClick={() => setAnchorEl(null)}>
                      <ListItemText primary="Dashboard" primaryTypographyProps={{ fontSize: "0.8125rem" }} />
                    </MenuItem>
                    <MenuItem component="a" href="/pricing" onClick={() => setAnchorEl(null)}>
                      <ListItemText primary="Plans & Billing" primaryTypographyProps={{ fontSize: "0.8125rem" }} />
                    </MenuItem>
                    <Divider />
                    <form action={logoutAction} style={{ margin: 0 }}>
                      <MenuItem
                        component="button"
                        type="submit"
                        onClick={() => setAnchorEl(null)}
                        sx={{ width: "100%" }}
                      >
                        <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: "0.8125rem", color: "error.main" }} />
                      </MenuItem>
                    </form>
                  </Menu>
                </>
              ) : (
                <>
                  <Button href="/login" size="small" sx={{ fontWeight: 600, color: "#4b5563" }}>
                    Sign In
                  </Button>
                  <Button href="/register" variant="contained" size="small" sx={{ fontWeight: 600, borderRadius: 2, px: 2 }}>
                    Start Free
                  </Button>
                </>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ borderTop: "1px solid #e2e8f0", py: 3, textAlign: "center" }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
            <Typography component="span" sx={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              &copy; {new Date().getFullYear()} Get Slot. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Link href="/pricing" style={{ fontSize: "0.75rem", color: "#9ca3af", textDecoration: "none" }}>
                Pricing
              </Link>
              <Link href="/features" style={{ fontSize: "0.75rem", color: "#9ca3af", textDecoration: "none" }}>
                Features
              </Link>
              <Link href="/login" style={{ fontSize: "0.75rem", color: "#9ca3af", textDecoration: "none" }}>
                Sign In
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box >
  );
}
