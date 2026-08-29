"use client";

/**
 * Customer App Shell — Milestone 14.3.
 *
 * Consumer-friendly, mobile-first shell with:
 * - Compact top bar with identity + menu
 * - Simple bottom navigation (mobile) or top tabs (desktop)
 * - Clean content area
 */

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import HomeIcon from "@mui/icons-material/Home";
import EventIcon from "@mui/icons-material/Event";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import PersonIcon from "@mui/icons-material/Person";
import { logoutAction } from "@/features/auth/actions/logout";
import {
  CUSTOMER_TOP_BAR_HEIGHT,
  CUSTOMER_MAX_WIDTH,
  customerPalette,
} from "@/styles/theme/customer-tokens";

type Props = {
  accountName: string | null;
  children: ReactNode;
};

const NAV_ITEMS = [
  { label: "Home", href: "/customer", icon: <HomeIcon /> },
  { label: "Appointments", href: "/customer/appointments", icon: <EventIcon /> },
  { label: "Businesses", href: "/customer/businesses", icon: <StorefrontIcon /> },
  { label: "Rewards", href: "/customer/rewards", icon: <CardGiftcardIcon /> },
  { label: "Account", href: "/customer/account", icon: <PersonIcon /> },
];

export default function CustomerShell({ accountName, children }: Props) {
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const currentNavIndex = NAV_ITEMS.findIndex((item) =>
    item.href === "/customer"
      ? pathname === "/customer"
      : pathname.startsWith(item.href)
  );

  const initials = accountName
    ? accountName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: customerPalette.page.bg, pb: { xs: "72px", sm: 0 } }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: customerPalette.topBar.bg,
          borderBottom: `1px solid ${customerPalette.topBar.border}`,
          height: CUSTOMER_TOP_BAR_HEIGHT,
          zIndex: 1100,
        }}
      >
        <Toolbar
          sx={{
            minHeight: `${CUSTOMER_TOP_BAR_HEIGHT}px !important`,
            maxWidth: CUSTOMER_MAX_WIDTH,
            width: "100%",
            mx: "auto",
            px: { xs: 2, sm: 3 },
          }}
        >
          <Box component="a" href="/customer" sx={{ display: "flex", alignItems: "center", gap: 1, textDecoration: "none", mr: "auto" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/getslot_icon.svg" alt="" width={28} height={28} />
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "1rem",
                color: customerPalette.topBar.text,
              }}
            >
              My Account
            </Typography>
          </Box>

          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="small"
            aria-label="Account menu"
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: "0.75rem",
                fontWeight: 700,
                bgcolor: customerPalette.accent.primaryLight,
                color: customerPalette.accent.primary,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            {accountName && (
              <MenuItem disabled sx={{ opacity: 1, fontSize: "0.8125rem", fontWeight: 600 }}>
                {accountName}
              </MenuItem>
            )}
            <MenuItem component="a" href="/customer/account" onClick={() => setAnchorEl(null)}>
              Account Settings
            </MenuItem>
            <MenuItem component="a" href="/customer/payments" onClick={() => setAnchorEl(null)}>
              Payments
            </MenuItem>
            <MenuItem component="a" href="/customer/communications" onClick={() => setAnchorEl(null)}>
              Communications
            </MenuItem>
            <form action={logoutAction}>
              <MenuItem
                component="button"
                type="submit"
                sx={{ width: "100%", color: "error.main" }}
              >
                Sign out
              </MenuItem>
            </form>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box
        component="main"
        sx={{
          pt: `${CUSTOMER_TOP_BAR_HEIGHT}px`,
          maxWidth: CUSTOMER_MAX_WIDTH,
          mx: "auto",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
        }}
      >
        {children}
      </Box>

      {/* Mobile bottom navigation */}
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: { xs: "block", sm: "none" },
          zIndex: 1100,
          borderTop: `1px solid ${customerPalette.topBar.border}`,
        }}
        elevation={0}
      >
        <BottomNavigation
          value={currentNavIndex >= 0 ? currentNavIndex : 0}
          showLabels
          sx={{ height: 64 }}
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.href}
              label={item.label}
              icon={item.icon}
              component="a"
              href={item.href}
              sx={{
                minWidth: 0,
                "& .MuiBottomNavigationAction-label": { fontSize: "0.65rem", mt: 0.25 },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
