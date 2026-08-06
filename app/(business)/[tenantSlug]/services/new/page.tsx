import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getServiceCategories } from "@/features/service-categories/services/get-service-categories";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import { getBusinessLocations } from "@/features/locations/services/get-business-locations";
import ServiceFormWithLocations from "@/features/services/components/service-form-with-locations";
import type { ServiceFormValues } from "@/features/services/schemas/service-schema";

export default async function NewServicePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const [categories, settings, locations] = await Promise.all([
    getServiceCategories(tenant.id),
    getBusinessSettings(tenant.id).catch(() => null),
    getBusinessLocations(tenant.id),
  ]);

  const defaultCurrency = settings?.defaultCurrency ?? "EUR";

  const initialValues: ServiceFormValues = {
    name: "", slug: "", serviceCategoryId: null, description: "",
    durationMinutes: 30, price: 0, currency: defaultCurrency,
    bufferBeforeMinutes: 0, bufferAfterMinutes: 0, isActive: true,
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}><Link component={NextLink} href={`/${tenantSlug}/services`} variant="body2">&larr; Back to Services</Link></Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>Add Service</Typography>
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
        <ServiceFormWithLocations
          initialValues={initialValues}
          submitLabel="Create Service"
          canEdit={true}
          categories={categories}
          locations={locations}
          tenantSlug={tenantSlug}
        />
      </Paper>
    </Box>
  );
}
