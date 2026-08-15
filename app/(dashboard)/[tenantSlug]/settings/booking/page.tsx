import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getTenantBookingRules } from "@/features/booking-rules/services/get-booking-rules";
import TenantBookingRulesForm from "@/features/booking-rules/components/tenant-booking-rules-form";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function BookingSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const canEdit = EDITABLE_ROLES.includes(membership.role);

  let existingRules;
  try {
    existingRules = await getTenantBookingRules(tenant.id);
  } catch {
    return (
      <Box>
        <Alert severity="error">
          Unable to load booking rules. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link component="a" href={`/${tenantSlug}/settings`} variant="body2">
          &larr; Back to Settings
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Booking Rules
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure default booking policies for your business. Individual services can override these settings.
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <TenantBookingRulesForm
          tenantSlug={tenantSlug}
          existingRules={existingRules}
          canEdit={canEdit}
        />
      </Paper>
    </Box>
  );
}
