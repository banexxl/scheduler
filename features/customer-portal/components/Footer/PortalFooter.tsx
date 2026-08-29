"use client";

/**
 * Portal Footer — Premium dark with subtle accents.
 *
 * Business info, contact details, auth link, copyright.
 * Dark theme matching the rest of the storefront.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import PlaceIcon from "@mui/icons-material/Place";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import { usePortalAuth } from "../portal-auth-provider";

export default function PortalFooter() {
  const { branding, tenant, portal } = useTenantTheme();
  const { isLoggedIn } = usePortalAuth();

  const { address, contactPhone, contactEmail } = portal;
  const primaryColor = branding.primaryColor;
  const year = new Date().getFullYear();

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
        bgcolor: "#0a0a0f",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        py: { xs: 5, md: 6 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 960, mx: "auto" }}>
        {/* Brand */}
        <Typography
          sx={{
            fontSize: "1.125rem",
            fontWeight: 800,
            color: "#f0f0f5",
            mb: 3,
          }}
        >
          {tenant.name}
        </Typography>

        {/* Contact Info */}
        {hasContactInfo && (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {addressParts && (
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <PlaceIcon sx={{ fontSize: 16, color: "#5c5c72", mt: 0.25 }} />
                <Typography sx={{ fontSize: "0.8125rem", color: "#8b8b9e" }}>
                  {addressParts}
                </Typography>
              </Stack>
            )}
            {contactPhone && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <PhoneIcon sx={{ fontSize: 16, color: "#5c5c72" }} />
                <Link
                  href={`tel:${contactPhone}`}
                  sx={{ fontSize: "0.8125rem", color: "#8b8b9e", textDecoration: "none", "&:hover": { color: primaryColor } }}
                >
                  {contactPhone}
                </Link>
              </Stack>
            )}
            {contactEmail && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <EmailIcon sx={{ fontSize: 16, color: "#5c5c72" }} />
                <Link
                  href={`mailto:${contactEmail}`}
                  sx={{ fontSize: "0.8125rem", color: "#8b8b9e", textDecoration: "none", "&:hover": { color: primaryColor } }}
                >
                  {contactEmail}
                </Link>
              </Stack>
            )}
          </Stack>
        )}

        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 2.5 }} />

        {/* Bottom row */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
          <Typography sx={{ fontSize: "0.75rem", color: "#3a3a4a" }}>
            &copy; {year} {tenant.name}. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Link
              href={isLoggedIn ? `/book/${tenant.slug}/portal` : `/book/${tenant.slug}/login`}
              sx={{ fontSize: "0.75rem", color: "#5c5c72", textDecoration: "none", "&:hover": { color: "#8b8b9e" } }}
            >
              {isLoggedIn ? "My Account" : "Sign In"}
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <img src="/logos/getslot_icon.svg" alt="" width={12} height={12} />
              <Typography sx={{ fontSize: "0.6875rem", color: "#3a3a4a" }}>
                Powered by GetSlot
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
