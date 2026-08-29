"use client";

/**
 * Mobile Navigation Drawer — Milestone 16.3.
 *
 * Slide-in drawer for mobile navigation.
 * Shows all portal nav items with active state.
 */

import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import { usePortalAuth } from "../portal-auth-provider";
import { usePortalNavigation } from "../../hooks/usePortalNavigation";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MobileNavigation({ open, onClose }: Props) {
  const { branding, tenant } = useTenantTheme();
  const { isLoggedIn } = usePortalAuth();
  const { items, tenantSlug } = usePortalNavigation();

  const logoUrl = branding.logoUrl;
  const initials = tenant.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      aria-label="Navigation menu"
      PaperProps={{ sx: { width: 280 } }}
    >
      {/* Brand header */}
      <Box
        sx={{
          px: 2,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        {logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt={`${tenant.name} logo`}
            sx={{ height: 32, maxWidth: 100, objectFit: "contain" }}
          />
        ) : (
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: branding.primaryColor,
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            {initials}
          </Avatar>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {tenant.name}
        </Typography>
      </Box>

      <Divider />

      {/* Nav items */}
      <List component="nav" aria-label="Portal navigation">
        {items.map((item) => (
          <ListItemButton
            key={item.href}
            component="a"
            href={item.href}
            selected={item.active}
            onClick={onClose}
            sx={{
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              },
            }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Divider />

      {/* Auth link */}
      <List>
        {isLoggedIn ? (
          <ListItemButton
            component="a"
            href={`/book/${tenantSlug}/portal`}
            onClick={onClose}
          >
            <ListItemText primary="My Account" />
          </ListItemButton>
        ) : (
          <>
            <ListItemButton
              component="a"
              href={`/book/${tenantSlug}/login`}
              onClick={onClose}
            >
              <ListItemText primary="Sign In" />
            </ListItemButton>
            <ListItemButton
              component="a"
              href={`/book/${tenantSlug}/register`}
              onClick={onClose}
            >
              <ListItemText primary="Create Account" />
            </ListItemButton>
          </>
        )}
      </List>

      <Divider />

      {/* CTA */}
      <Box sx={{ p: 2 }}>
        <Button
          href={`/book/${tenantSlug}#booking`}
          variant="contained"
          fullWidth
          onClick={onClose}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Book Appointment
        </Button>
      </Box>
    </Drawer>
  );
}
