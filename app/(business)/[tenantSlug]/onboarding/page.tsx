import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createClient } from "@/lib/supabase/server";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import { resolveOnboardingProgress } from "@/features/onboarding/services/get-onboarding-progress";
import type { OnboardingPageData } from "@/features/onboarding/types/onboarding";
import OnboardingClientPage from "./client-page";

export default async function OnboardingPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
     const { tenantSlug } = await params;
     const { tenant, membership } = await requireTenantMember(tenantSlug);

     if (!(["owner", "admin"].includes(membership.role))) {
          redirect(`/${tenantSlug}/dashboard`);
     }

     const supabase = await createClient();
     const [settings, onboardingRow, locationsResult, resourcesResult, servicesResult, locationHoursResult, resourceHoursResult, bookingRulesResult, publicBookingResult] = await Promise.all([
          getBusinessSettings(tenant.id),
          supabase.from("tenant_onboarding").select("current_step, status, started_at, completed_at, last_activity_at").eq("tenant_id", tenant.id).maybeSingle(),
          supabase.from("locations").select("id").eq("tenant_id", tenant.id).eq("is_active", true),
          supabase.from("resources").select("id").eq("tenant_id", tenant.id).eq("is_active", true),
          supabase.from("services").select("id").eq("tenant_id", tenant.id).eq("is_active", true),
          supabase.from("location_working_hours").select("id, location_id").limit(1),
          supabase.from("resource_working_hours").select("id, tenant_id").eq("tenant_id", tenant.id).limit(1),
          supabase.from("tenant_booking_rules").select("minimum_notice_minutes").eq("tenant_id", tenant.id).maybeSingle(),
          supabase.from("tenant_public_booking_settings").select("is_enabled").eq("tenant_id", tenant.id).maybeSingle(),
     ]);

     const onboardingRowData = onboardingRow.data;
     const progress = resolveOnboardingProgress({
          currentStep: onboardingRowData?.current_step ?? "business_details",
          status: onboardingRowData?.status ?? "not_started",
          tenant: {
               name: settings.name,
               defaultTimezone: settings.defaultTimezone,
               defaultCurrency: settings.defaultCurrency,
          },
          locations: locationsResult.data ?? [],
          resources: resourcesResult.data ?? [],
          services: servicesResult.data ?? [],
          locationHours: locationHoursResult.data ?? [],
          resourceHours: resourceHoursResult.data ?? [],
          bookingRules: bookingRulesResult.data ? { minimumNoticeMinutes: bookingRulesResult.data.minimum_notice_minutes } : null,
          publicBookingSettings: publicBookingResult.data ? { isEnabled: publicBookingResult.data.is_enabled } : null,
          plan: { canUsePublicBooking: true },
     });

     const pageData: OnboardingPageData = {
          tenant: {
               id: tenant.id,
               slug: tenant.slug,
               name: settings.name,
               timezone: settings.defaultTimezone,
          },
          progress,
          billing: {
               planKey: "free",
               canUsePublicBooking: true,
          },
          summary: {
               locationCount: locationsResult.data?.length ?? 0,
               resourceCount: resourcesResult.data?.length ?? 0,
               serviceCount: servicesResult.data?.length ?? 0,
               hasLocationHours: (locationHoursResult.data?.length ?? 0) > 0,
               hasResourceHours: (resourceHoursResult.data?.length ?? 0) > 0,
          },
     };

     return <OnboardingClientPage data={pageData} tenantSlug={tenantSlug} />;
}
