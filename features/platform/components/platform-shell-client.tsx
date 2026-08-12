"use client";

/**
 * Platform Admin Shell Client Wrapper — Milestone 14.1.
 *
 * Manages mobile drawer state and renders the interactive shell.
 * Receives only serializable props from the server layout.
 */

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import PlatformSidebar from "./platform-sidebar";
import PlatformTopBar from "./platform-top-bar";
import {
  TOP_BAR_HEIGHT,
  platformPalette,
} from "@/styles/theme/platform-admin-tokens";
import { logoutAction } from "@/features/auth/actions/logout";

type Props = {
  email: string;
  role: string;
  children: ReactNode;
};

export default function PlatformShellClient({ email, role, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: platformPalette.page.bg }}>
      {/* Sidebar */}
      <PlatformSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0, // prevent flex child overflow
        }}
      >
        {/* Top bar */}
        <PlatformTopBar
          email={email}
          role={role}
          onMenuClick={() => setMobileOpen(true)}
          logoutAction={logoutAction}
        />

        {/* Page content */}
        <Box
          sx={{
            mt: `${TOP_BAR_HEIGHT}px`,
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
            flex: 1,
            maxWidth: 1400,
            width: "100%",
            mx: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
