import Link from "next/link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const platformSections = [
  {
    title: "Dashboard",
    description: "Overview of platform operations and key health signals.",
    href: "/platform/dashboard",
  },
  {
    title: "Billing Products",
    description:
      "Map Polar products to local plans and inspect webhook/sync diagnostics.",
    href: "/platform/billing/products",
  },
  {
    title: "Subscriptions",
    description: "Subscription management workflows and lifecycle controls.",
    href: "/platform/subscriptions",
  },
  {
    title: "Tenants",
    description: "Inspect tenant records, states, and operational details.",
    href: "/platform/tenants",
  },
  {
    title: "Users",
    description: "User management and account-level operations.",
    href: "/platform/users",
  },
  {
    title: "Audit Logs",
    description: "Security and operational audit trail.",
    href: "/platform/audit-logs",
  },
];

export default function PlatformHomePage() {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Platform Administration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select an operational area.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {platformSections.map((section) => (
          <Grid key={section.href} size={{ xs: 12, md: 6, lg: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
              <Stack spacing={2}>
                <Typography variant="h6">{section.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {section.description}
                </Typography>
                <Button component={Link} href={section.href} variant="outlined">
                  Open
                </Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
