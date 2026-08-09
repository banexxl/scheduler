"use client";

/**
 * Business Shell — Milestone 10.4.
 *
 * Responsive AppBar + mobile navigation drawer for the business backoffice.
 * Desktop: AppBar with inline nav links.
 * Mobile: AppBar with hamburger → navigation drawer.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { logoutAction } from "@/features/auth/actions/logout";

type Props = {
  tenantName: string;
  tenantSlug: string;
  userEmail: string;
  role: string;
};

type NavItem = { label: string; href: string };

function getNavItems(slug: string): NavItem[] {
  return [
    { label: "Dashboard", href: `/${slug}/dashboard` },
    { label: "Calendar", href: `/${slug}/calendar` },
    { label: "Appointments", href: `/${slug}/appointments` },
    { label: "Customers", href: `/${slug}/customers` },
    { label: "Services", href: `/${slug}/services` },
    { label: "Resources", href: `/${slug}/resources` },
    { label: "Locations", href: `/${slug}/locations` },
    { label: "Packages", href: `/${slug}/packages` },
    { label: "Reviews", href: `/${slug}/reviews` },
    { label: "Waitlist", href: `/${slug}/waitlist` },
    { label: "Settings", href: `/${slug}/settings` },
  ];
}

export default function BusinessShell({ tenantName, tenantSlug, userEmail, role }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const navItems = getNavItems(tenantSlug);

  function isActive(href: string): boolean {
    if (href === `/${tenantSlug}/dashboard`) return pathname === href || pathname === `/${tenantSlug}`;
    return pathname.startsWith(href);
  }

  return (
    <>
      <AppBar position="sticky" color="default" elevation={1} component="header">
        <Toolbar sx={{ gap: 1 }}>
          {/* Mobile hamburger */}
          <IconButton
            edge="start"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: "flex", md: "none" } }}
          >
            &#9776;
          </IconButton>

          {/* Business name */}
          <Typography
            variant="h6"
            component="a"
            href={`/${tenantSlug}/dashboard`}
            sx={{
              textDecoration: "none",
              color: "inherit",
              flexShrink: 0,
              mr: 2,
            }}
          >
            {tenantName}
          </Typography>

          {/* Desktop inline navigation */}
          <Box
            component="nav"
            aria-label="Business navigation"
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 0.5,
              flexGrow: 1,
              overflowX: "auto",
            }}
          >
            {navItems.map((item) => (
              <Button
                key={item.href}
                component="a"
                href={item.href}
                size="small"
                variant={isActive(item.href) ? "contained" : "text"}
                color={isActive(item.href) ? "primary" : "inherit"}
                sx={{ whiteSpace: "nowrap", minWidth: "auto", px: 1.5 }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Spacer for mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: "block", md: "none" } }} />

          {/* Role chip (desktop only) */}
          <Chip
            label={role}
            size="small"
            variant="outlined"
            sx={{ display: { xs: "none", sm: "flex" } }}
          />

          {/* Sign out */}
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outlined"
              size="small"
              sx={{ display: { xs: "none", sm: "flex" }, whiteSpace: "nowrap" }}
            >
              Sign Out
            </Button>
          </form>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        aria-label="Business navigation"
        sx={{ display: { xs: "block", md: "none" } }}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {tenantName}
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
            &#10005;
          </IconButton>
        </Box>

        <Divider />

        <List component="nav" aria-label="Business sections">
          {navItems.map((item) => (
            <ListItemButton
              key={item.href}
              component="a"
              href={item.href}
              selected={isActive(item.href)}
              onClick={() => setDrawerOpen(false)}
              sx={{ minHeight: 48 }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ mt: "auto" }} />

        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            {userEmail}
          </Typography>
          <Chip label={role} size="small" variant="outlined" sx={{ mb: 1 }} />
          <form action={logoutAction}>
            <Button type="submit" variant="outlined" size="small" fullWidth>
              Sign Out
            </Button>
          </form>
        </Box>
      </Drawer>
    </>
  );
}
