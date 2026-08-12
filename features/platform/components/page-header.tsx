import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import { platformTypography } from "@/styles/theme/platform-admin-tokens";

/**
 * Platform Page Header — Milestone 14.1.
 *
 * Consistent page header with title, optional description, breadcrumbs, and action slot.
 */

type Breadcrumb = { label: string; href?: string };

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  action?: React.ReactNode;
  status?: React.ReactNode;
};

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  status,
}: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator="/"
          sx={{ mb: 1, "& .MuiBreadcrumbs-separator": { mx: 0.5, color: "#9ca3af" } }}
        >
          {breadcrumbs.map((crumb, idx) =>
            crumb.href && idx < breadcrumbs.length - 1 ? (
              <Link
                key={crumb.label}
                component="a"
                href={crumb.href}
                underline="hover"
                sx={{ fontSize: "0.8125rem", color: "#6b7280" }}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography
                key={crumb.label}
                sx={{ fontSize: "0.8125rem", color: "#374151" }}
              >
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography component="h1" sx={platformTypography.pageTitle}>
              {title}
            </Typography>
            {status}
          </Stack>
          {description && (
            <Typography sx={{ ...platformTypography.secondary, mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
