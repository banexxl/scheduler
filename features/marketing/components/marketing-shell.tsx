"use client";

/**
 * Marketing Shell — shared layout wrapper for all marketing pages.
 *
 * - Sticky header with logo and auth-aware nav
 * - Clean background
 * - Footer
 */

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Link from "next/link";

type Props = {
  children: ReactNode;
  userEmail: string | null;
};

export default function MarketingShell({ children, userEmail }: Props) {
  const isLoggedIn = Boolean(userEmail);

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
                  <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", display: { xs: "none", sm: "block" } }}>
                    {userEmail}
                  </Typography>
                  <Button href="/api/home" variant="contained" size="small" sx={{ fontWeight: 600, borderRadius: 2, px: 2 }}>
                    Dashboard
                  </Button>
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
