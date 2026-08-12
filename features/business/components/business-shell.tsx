"use client";

/**
 * Business Shell — Milestone 14.2.
 *
 * Redesigned layout: sidebar (desktop) + top bar + content area.
 * Mobile: drawer + top bar.
 *
 * Receives only serializable props from the server layout.
 */

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import TenantSidebar from "./tenant-sidebar";
import TenantTopBar from "./tenant-top-bar";
import { logoutAction } from "@/features/auth/actions/logout";
import {
  TENANT_TOP_BAR_HEIGHT,
  tenantPalette,
} from "@/styles/theme/tenant-tokens";

type Props = {
  tenantName: string;
  tenantSlug: string;
  userEmail: string;
  role: string;
  children?: ReactNode;
};

export default function BusinessShell({
  tenantName,
  tenantSlug,
  userEmail,
  role,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: tenantPalette.page.bg }}>
      {/* Sidebar */}
      <TenantSidebar
        tenantName={tenantName}
        tenantSlug={tenantSlug}
        role={role}
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
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <TenantTopBar
          tenantSlug={tenantSlug}
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
          logoutAction={logoutAction}
        />

        {/* Page content */}
        <Box
          sx={{
            mt: `${TENANT_TOP_BAR_HEIGHT}px`,
            px: { xs: 2, sm: 3, md: 3.5 },
            py: { xs: 2, sm: 2.5 },
            flex: 1,
            maxWidth: 1200,
            width: "100%",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
