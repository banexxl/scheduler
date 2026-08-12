"use client";

/**
 * Tenant Business Top Bar — Milestone 14.2.
 *
 * Minimal top bar:
 * - Mobile menu trigger
 * - User identity + sign out
 * - Notification shortcut (badge)
 */

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import {
  TENANT_SIDEBAR_WIDTH,
  TENANT_TOP_BAR_HEIGHT,
  tenantPalette,
} from "@/styles/theme/tenant-tokens";

type TenantTopBarProps = {
  tenantSlug: string;
  userEmail: string;
  onMenuClick: () => void;
  logoutAction: () => Promise<void>;
};

export default function TenantTopBar({
  tenantSlug,
  userEmail,
  onMenuClick,
  logoutAction,
}: TenantTopBarProps) {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        left: { xs: 0, md: `${TENANT_SIDEBAR_WIDTH}px` },
        width: { xs: "100%", md: `calc(100% - ${TENANT_SIDEBAR_WIDTH}px)` },
        height: TENANT_TOP_BAR_HEIGHT,
        bgcolor: tenantPalette.topBar.bg,
        borderBottom: `1px solid ${tenantPalette.topBar.border}`,
        zIndex: 1100,
      }}
    >
      <Toolbar
        sx={{
          minHeight: `${TENANT_TOP_BAR_HEIGHT}px !important`,
          px: { xs: 1.5, sm: 2.5 },
        }}
      >
        {/* Mobile menu */}
        <IconButton
          edge="start"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          sx={{
            display: { xs: "flex", md: "none" },
            mr: 1,
            color: tenantPalette.topBar.text,
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        {/* Notifications shortcut */}
        <IconButton
          component="a"
          href={`/${tenantSlug}/notifications`}
          size="small"
          aria-label="Notifications"
          sx={{ color: tenantPalette.topBar.textSecondary, mr: 1 }}
        >
          <NotificationsNoneIcon fontSize="small" />
        </IconButton>

        {/* User identity */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            sx={{
              fontSize: "0.8125rem",
              color: tenantPalette.topBar.textSecondary,
              display: { xs: "none", sm: "block" },
            }}
          >
            {userEmail}
          </Typography>
          <form action={logoutAction}>
            <Button
              type="submit"
              size="small"
              variant="text"
              sx={{
                fontSize: "0.75rem",
                color: tenantPalette.topBar.textSecondary,
                textTransform: "none",
                minWidth: "auto",
                "&:hover": { color: tenantPalette.topBar.text },
              }}
            >
              Sign out
            </Button>
          </form>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
