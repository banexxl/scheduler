import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getService } from "@/features/services/services/get-services";
import {
  getTenantBookingRules,
  getServiceBookingRules,
} from "@/features/booking-rules/services/get-booking-rules";
import ServiceBookingRulesForm from "@/features/booking-rules/components/service-booking-rules-form";

const EDITABLE_ROLES = ["owner", "admin"];

export default async function ServiceBookingRulesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; serviceId: string }>;
}) {
  const { tenantSlug, serviceId } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);
  const canEdit = EDITABLE_ROLES.includes(membership.role);

  const [service, tenantRules, serviceRules] = await Promise.all([
    getService(tenant.id, serviceId),
    getTenantBookingRules(tenant.id),
    getServiceBookingRules(tenant.id, serviceId),
  ]);

  if (!service) notFound();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Link
          component={NextLink}
          href={`/${tenantSlug}/services/${serviceId}/edit`}
          variant="body2"
        >
          &larr; Back to Service
        </Link>
      </Box>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Booking Rules: {service.name}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Override tenant booking rules for this service. Fields set to &ldquo;Use tenant default&rdquo; will
        inherit from your business-level booking settings.
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ServiceBookingRulesForm
          tenantSlug={tenantSlug}
          serviceId={serviceId}
          tenantRules={tenantRules}
          serviceRules={serviceRules}
          canEdit={canEdit}
        />
      </Paper>
    </Box>
  );
}
