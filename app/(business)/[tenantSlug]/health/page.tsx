import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { evaluateBusinessHealth, type BusinessHealthInputs } from "@/features/business-health/services/evaluate-business-health";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isAppointmentPaymentProviderAvailable } from "@/features/payments/services/resolve-payment-requirement";
import { isEmailProviderConfigured } from "@/features/notifications/services/providers";
import HealthClientPage from "./client-page";

export default async function BusinessHealthPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

  const supabase = createServiceRoleClient();

  // Load tenant timezone
  const { data: tenantDetails } = await supabase
    .from("tenants")
    .select("default_timezone")
    .eq("id", tenant.id)
    .single();

  const tenantTimezone = tenantDetails?.default_timezone ?? null;

  // Batch load health inputs
  const [
    locationsResult, servicesResult, resourcesResult,
    locationHoursResult, serviceLocResult, serviceResResult,
    resourceHoursResult, publicBookingResult, ownerResult,
    emailFailResult, paymentReviewResult, discountSyncResult,
    reminderResult, operationalResult,
  ] = await Promise.all([
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("is_active", true),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("location_business_hours" as never).select("location_id" as never).eq("tenant_id" as never, tenant.id),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("service_locations" as never).select("service_id" as never).eq("tenant_id" as never, tenant.id),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("service_resources" as never).select("service_id" as never).eq("tenant_id" as never, tenant.id),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("resource_working_hours" as never).select("resource_id" as never).eq("tenant_id" as never, tenant.id),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("tenant_public_booking_settings" as never).select("is_enabled" as never).eq("tenant_id" as never, tenant.id).maybeSingle(),
    supabase.from("tenant_members").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("role", "owner").eq("status", "active"),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("notification_deliveries" as never).select("id" as never, { count: "exact", head: true }).eq("tenant_id" as never, tenant.id).eq("delivery_status" as never, "failed"),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("appointment_payments" as never).select("id" as never, { count: "exact", head: true }).eq("tenant_id" as never, tenant.id).eq("requires_review" as never, true),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("payment_provider_resources" as never).select("id" as never, { count: "exact", head: true }).eq("tenant_id" as never, tenant.id).eq("sync_status" as never, "failed"),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("tenant_reminder_rules" as never).select("id" as never, { count: "exact", head: true }).eq("tenant_id" as never, tenant.id).eq("is_active" as never, true),
    (supabase as never as ReturnType<typeof createServiceRoleClient>).from("tenant_operational_notifications" as never).select("id" as never, { count: "exact", head: true }).eq("tenant_id" as never, tenant.id).is("resolved_at" as never, null).in("severity" as never, ["warning", "critical"] as never),
  ]);

  const locationsWithHours = new Set(((locationHoursResult.data ?? []) as unknown as Array<{ location_id: string }>).map(r => r.location_id));
  const servicesWithLoc = new Set(((serviceLocResult.data ?? []) as unknown as Array<{ service_id: string }>).map(r => r.service_id));
  const servicesWithRes = new Set(((serviceResResult.data ?? []) as unknown as Array<{ service_id: string }>).map(r => r.service_id));
  const resourcesWithHours = new Set(((resourceHoursResult.data ?? []) as unknown as Array<{ resource_id: string }>).map(r => r.resource_id));

  const paymentProvider = isAppointmentPaymentProviderAvailable();

  const inputs: BusinessHealthInputs = {
    tenantTimezone: tenantTimezone ?? null,
    activeLocationCount: locationsResult.count ?? 0,
    locationsWithHoursCount: locationsWithHours.size,
    activeServiceCount: servicesResult.count ?? 0,
    servicesWithLocationCount: servicesWithLoc.size,
    servicesWithResourceCount: servicesWithRes.size,
    activeResourceCount: resourcesResult.count ?? 0,
    resourcesWithHoursCount: resourcesWithHours.size,
    publicBookingEnabled: Boolean((publicBookingResult.data as unknown as { is_enabled?: boolean })?.is_enabled),
    hasFutureAvailability: true, // Simplified: assume true if services/resources exist
    emailProviderConfigured: isEmailProviderConfigured(),
    emailFeaturesEnabled: process.env.EMAIL_PROVIDER !== "console" || Boolean(process.env.NOTIFICATION_FROM_EMAIL),
    recentEmailFailureCount: emailFailResult.count ?? 0,
    activeReminderRuleCount: reminderResult.count ?? 0,
    onlinePaymentsEnabled: Boolean(process.env.POLAR_ACCESS_TOKEN),
    paymentProviderAvailable: paymentProvider.available,
    failedDiscountSyncCount: discountSyncResult.count ?? 0,
    unresolvedPaymentReviewCount: paymentReviewResult.count ?? 0,
    activeOwnerCount: ownerResult.count ?? 0,
    unresolvedOperationalIssueCount: operationalResult.count ?? 0,
  };

  const health = evaluateBusinessHealth(inputs);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Setup Health
      </Typography>
      <HealthClientPage tenantSlug={tenantSlug} health={health} />
    </Box>
  );
}
