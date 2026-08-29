"use client";

/**
 * Portal Footer — Milestone 16.3.
 *
 * Business information footer: logo, name, address, phone, email, copyright.
 * Hides sections with no data. Uses tenant branding for styling.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Avatar from "@mui/material/Avatar";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import { usePortalAuth } from "../portal-auth-provider";

export default function PortalFooter() {
  const { branding, tenant, portal } = useTenantTheme();
  const { isLoggedIn } = usePortalAuth();

  const { address, contactPhone, contactEmail } = portal;
  const logoUrl = branding.logoUrl;
  const initials = tenant.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const year = new Date().getFullYear();

  // Build address string
  const addressParts = address
    ? [address.street, address.city, address.state, address.postalCode, address.country]
      .filter(Boolean)
      .join(", ")
    : null;

  const hasContactInfo = addressParts || contactPhone || contactEmail;

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        py: { xs: 4, md: 5 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        {/* Logo + Name */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ mb: 3 }}
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
        </Stack>

        {/* Contact Info */}
        {hasContactInfo && (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {addressParts && (
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <PlaceIcon
                  sx={{ fontSize: 18, color: "text.secondary", mt: 0.25 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {addressParts}
                </Typography>
              </Stack>
            )}

            {contactPhone && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <PhoneIcon
                  sx={{ fontSize: 18, color: "text.secondary" }}
                />
                <Link
                  href={`tel:${contactPhone}`}
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                >
                  {contactPhone}
                </Link>
              </Stack>
            )}

            {contactEmail && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <EmailIcon
                  sx={{ fontSize: 18, color: "text.secondary" }}
                />
                <Link
                  href={`mailto:${contactEmail}`}
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                >
                  {contactEmail}
                </Link>
              </Stack>
            )}
          </Stack>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Copyright */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="caption" color="text.secondary">
            &copy; {year} {tenant.name}. All rights reserved.
          </Typography>
          <Link
            href={isLoggedIn ? `/book/${tenant.slug}/portal` : `/book/${tenant.slug}/login`}
            variant="caption"
            color="text.secondary"
            underline="hover"
          >
            {isLoggedIn ? "My Account" : "Sign In"}
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
