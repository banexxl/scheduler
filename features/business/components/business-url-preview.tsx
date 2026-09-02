"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { clientEnvironment } from "@/lib/environment/client";

type BusinessUrlPreviewProps = {
  slug: string;
};

/**
 * Displays a live preview of the generated public site and dashboard URLs.
 * Uses environment-aware URLs (localhost in dev, production domain in prod).
 */
export default function BusinessUrlPreview({ slug }: BusinessUrlPreviewProps) {
  const appUrl = clientEnvironment.appUrl;

  const displaySlug = slug || "your-business";
  const isPlaceholder = !slug;

  // Build environment-aware URLs
  const publicSiteUrl = `${appUrl}/book/${displaySlug}`;
  const dashboardUrl = `${appUrl}/${displaySlug}/dashboard`;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: "grey.50",
        opacity: isPlaceholder ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1, fontWeight: 500 }}
      >
        Your business URLs
      </Typography>

      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
          Public site
        </Typography>
        <Link
          href={publicSiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="body2"
          sx={{
            display: "block",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "primary.main",
            wordBreak: "break-all",
            textDecoration: "underline",
          }}
          aria-label={`Public site URL: ${publicSiteUrl}`}
        >
          {publicSiteUrl}
        </Link>
      </Box>

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
          Dashboard
        </Typography>
        <Link
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="body2"
          sx={{
            display: "block",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "primary.main",
            wordBreak: "break-all",
            textDecoration: "underline",
          }}
          aria-label={`Dashboard URL: ${dashboardUrl}`}
        >
          {dashboardUrl}
        </Link>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1.5, fontStyle: "italic" }}
      >
        Availability will be checked when you submit.
      </Typography>
    </Paper>
  );
}
