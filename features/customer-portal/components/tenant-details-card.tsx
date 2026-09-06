"use client";

/**
 * Tenant Details Card.
 *
 * Shows the business's details (as configured by the tenant) on the portal
 * home: logo, name, description, address, contact info, and social links.
 * Reads from the TenantThemeProvider context, so no extra data fetching.
 * Dark-glass styled to match the portal.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import PlaceIcon from "@mui/icons-material/Place";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LanguageIcon from "@mui/icons-material/Language";
import { useTenantTheme } from "@/providers/tenant-theme-provider";

export default function TenantDetailsCard() {
     const { tenant, branding, portal } = useTenantTheme();

     const addressParts = portal.address
          ? [
               portal.address.street,
               portal.address.city,
               portal.address.state,
               portal.address.postalCode,
               portal.address.country,
          ]
               .filter(Boolean)
               .join(", ")
          : null;

     const socialEntries = Object.entries(portal.socialLinks ?? {}).filter(([, url]) => Boolean(url));

     const initials = tenant.name
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

     return (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
               <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: portal.description || addressParts ? 2 : 0 }}>
                    <Avatar
                         src={branding.logoUrl ?? undefined}
                         alt={tenant.name}
                         sx={{
                              width: 56,
                              height: 56,
                              bgcolor: "rgba(167,139,250,0.15)",
                              color: "#a78bfa",
                              fontWeight: 700,
                              fontSize: "1.25rem",
                              border: "1px solid rgba(167,139,250,0.3)",
                         }}
                    >
                         {initials}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                         <Typography variant="subtitle1" fontWeight={700} noWrap>
                              {tenant.name}
                         </Typography>
                         {branding.tagline && (
                              <Typography variant="caption" sx={{ color: "#8b8b9e" }}>
                                   {branding.tagline}
                              </Typography>
                         )}
                    </Box>
               </Stack>

               {portal.description && (
                    <Typography variant="body2" sx={{ color: "#c9c6d6", mb: 2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                         {portal.description}
                    </Typography>
               )}

               <Stack spacing={1}>
                    {addressParts && <InfoRow icon={<PlaceIcon sx={{ fontSize: 16 }} />} value={addressParts} />}
                    {portal.contactPhone && (
                         <InfoRow
                              icon={<PhoneIcon sx={{ fontSize: 16 }} />}
                              value={portal.contactPhone}
                              href={`tel:${portal.contactPhone}`}
                         />
                    )}
                    {portal.contactEmail && (
                         <InfoRow
                              icon={<EmailIcon sx={{ fontSize: 16 }} />}
                              value={portal.contactEmail}
                              href={`mailto:${portal.contactEmail}`}
                         />
                    )}
                    {portal.websiteUrl && (
                         <InfoRow
                              icon={<LanguageIcon sx={{ fontSize: 16 }} />}
                              value={portal.websiteUrl.replace(/^https?:\/\//, "")}
                              href={portal.websiteUrl}
                              external
                         />
                    )}
               </Stack>

               {socialEntries.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>
                         {socialEntries.map(([platform, url]) => (
                              <Chip
                                   key={platform}
                                   component="a"
                                   href={url}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   clickable
                                   label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                                   size="small"
                                   sx={{
                                        bgcolor: "rgba(255,255,255,0.05)",
                                        color: "#8b8b9e",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        "&:hover": { bgcolor: "rgba(167,139,250,0.1)", color: "#a78bfa" },
                                   }}
                              />
                         ))}
                    </Stack>
               )}
          </Paper>
     );
}

function InfoRow({
     icon,
     value,
     href,
     external,
}: {
     icon: React.ReactNode;
     value: string;
     href?: string;
     external?: boolean;
}) {
     const text = href ? (
          <Typography
               component="a"
               href={href}
               {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
               variant="body2"
               sx={{ color: "#c9c6d6", textDecoration: "none", "&:hover": { color: "#a78bfa" } }}
               noWrap
          >
               {value}
          </Typography>
     ) : (
          <Typography variant="body2" sx={{ color: "#c9c6d6" }} noWrap>
               {value}
          </Typography>
     );

     return (
          <Stack direction="row" spacing={1} alignItems="center">
               <Box sx={{ color: "#5c5c72", display: "flex" }}>{icon}</Box>
               {text}
          </Stack>
     );
}
