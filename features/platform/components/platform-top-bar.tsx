"use client";

/**
 * Platform Admin Top Bar — Milestone 14.1.
 *
 * Minimal top bar with:
 * - Mobile menu trigger
 * - Page context (breadcrumb area)
 * - Admin identity + sign out
 */

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import MenuIcon from "@mui/icons-material/Menu";
import InstallAppButton from "@/components/dashboard/InstallAppButton";
import UserMenu from "@/components/dashboard/UserMenu";
import {
  SIDEBAR_WIDTH,
  TOP_BAR_HEIGHT,
  platformPalette,
} from "@/styles/theme/platform-admin-tokens";

type PlatformTopBarProps = {
  email: string;
  role: string;
  onMenuClick: () => void;
  logoutAction: () => Promise<void>;
};

export default function PlatformTopBar({
  email,
  role,
  onMenuClick,
  logoutAction,
}: PlatformTopBarProps) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        left: { xs: 0, md: SIDEBAR_WIDTH },
        width: { xs: "100%", md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        height: TOP_BAR_HEIGHT,
        bgcolor: platformPalette.topBar.bg,
        borderBottom: `1px solid ${platformPalette.topBar.border}`,
        zIndex: 1100,
      }}
    >
      <Toolbar
        sx={{
          minHeight: `${TOP_BAR_HEIGHT}px !important`,
          px: { xs: 1.5, sm: 2.5 },
        }}
      >
        {/* Mobile menu button */}
        <IconButton
          edge="start"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          sx={{
            display: { xs: "flex", md: "none" },
            mr: 1,
            color: platformPalette.topBar.text,
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Admin identity */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {/* Install app shortcut (Chrome-style) */}
          <InstallAppButton color={platformPalette.topBar.textSecondary} />

          {/* Account dropdown: email + role + logout */}
          <UserMenu email={email} role={role} logoutAction={logoutAction} />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
