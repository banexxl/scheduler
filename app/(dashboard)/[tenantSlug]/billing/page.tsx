import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireTenantRole(tenantSlug, ["owner", "admin"]);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack spacing={1.5}>
        <Typography variant="h5">Billing</Typography>
        <Typography color="text.secondary">
          Billing controls now live under Settings.
        </Typography>
        <Box>
          <Button
            component="a"
            href={`/${tenantSlug}/settings/billing`}
            variant="contained"
          >
            Go to Billing Settings
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
