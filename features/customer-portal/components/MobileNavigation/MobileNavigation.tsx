"use client";

/**
 * Mobile Navigation Drawer — Premium dark theme.
 *
 * Slide-in drawer with dark glass styling, auth links, and CTA.
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
  const primaryColor = branding.primaryColor;
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
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: "#16161e",
          color: "#f0f0f5",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        },
      }}
    >
      {/* Brand header */}
      <Box
        sx={{
          px: 2,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
              bgcolor: `${primaryColor}20`,
              border: `1px solid ${primaryColor}40`,
              color: primaryColor,
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            {initials}
          </Avatar>
        )}
        <Typography sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>
          {tenant.name}
        </Typography>
      </Box>

      {/* Nav items */}
      <List component="nav" aria-label="Portal navigation" sx={{ py: 1 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.href}
            component="a"
            href={item.href}
            selected={item.active}
            onClick={onClose}
            sx={{
              py: 1.25,
              "&.Mui-selected": {
                bgcolor: `${primaryColor}15`,
                color: primaryColor,
                "&:hover": { bgcolor: `${primaryColor}20` },
              },
              "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
            }}
          >
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: item.active ? 600 : 400 }}
            />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      {/* Auth links */}
      <List sx={{ py: 1 }}>
        {isLoggedIn ? (
          <ListItemButton
            component="a"
            href={`/book/${tenantSlug}/portal`}
            onClick={onClose}
            sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}
          >
            <ListItemText primary="My Account" primaryTypographyProps={{ fontSize: "0.875rem" }} />
          </ListItemButton>
        ) : (
          <>
            <ListItemButton
              component="a"
              href={`/book/${tenantSlug}/login`}
              onClick={onClose}
              sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}
            >
              <ListItemText primary="Sign In" primaryTypographyProps={{ fontSize: "0.875rem" }} />
            </ListItemButton>
            <ListItemButton
              component="a"
              href={`/book/${tenantSlug}/register`}
              onClick={onClose}
              sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.04)" } }}
            >
              <ListItemText primary="Create Account" primaryTypographyProps={{ fontSize: "0.875rem" }} />
            </ListItemButton>
          </>
        )}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      {/* CTA */}
      <Box sx={{ p: 2 }}>
        <Button
          href={`/book/${tenantSlug}#booking`}
          variant="contained"
          fullWidth
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            background: `linear-gradient(135deg, ${primaryColor}, ${branding.accentColor})`,
            boxShadow: `0 0 20px ${primaryColor}30`,
            "&:hover": { boxShadow: `0 0 30px ${primaryColor}50` },
          }}
        >
          Book Appointment
        </Button>
      </Box>
    </Drawer>
  );
}
