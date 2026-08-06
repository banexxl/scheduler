import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Link from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import BusinessSettingsForm from "@/features/business/components/business-settings-form";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let settings;
  try {
    settings = await getBusinessSettings(tenant.id);
  } catch {
    return (
      <Box>
        <Alert severity="error">
          Unable to load business settings. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Business Settings
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <BusinessSettingsForm
          settings={settings}
          tenantSlug={tenantSlug}
          canEdit={canEdit}
        />
      </Paper>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Billing</Typography>
          <Typography variant="body2" color="text.secondary">
            Open billing plans, checkout status, and customer portal controls.
          </Typography>
          <Button
            component={Link}
            href={`/${tenantSlug}/settings/billing`}
            variant="outlined"
            sx={{ width: "fit-content" }}
          >
            Open Billing Settings
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
