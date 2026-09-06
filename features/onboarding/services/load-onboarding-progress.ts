import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getBusinessSettings } from "@/features/business/services/get-business-settings";
import { resolveOnboardingProgress } from "./get-onboarding-progress";
import type { OnboardingProgress } from "../types/onboarding";

export type OnboardingSummary = {
     locationCount: number;
     resourceCount: number;
     serviceCount: number;
     hasLocationHours: boolean;
     hasResourceHours: boolean;
     hasBookingRules: boolean;
     hasPublicBookingSettings: boolean;
};

export type OnboardingLoadResult = {
     progress: OnboardingProgress;
     summary: OnboardingSummary;
     tenant: {
          name: string;
          timezone: string;
     };
     canUsePublicBooking: boolean;
};

/**
 * Loads onboarding-related data for a tenant and resolves the current progress.
 *
 * Shared by the onboarding page and the dashboard so both derive completion
 * state from the same source of truth. Uses the authenticated server client
 * (RLS active); the caller is responsible for authorizing tenant access.
 */
export async function loadOnboardingProgress(tenantId: string): Promise<OnboardingLoadResult> {
     const supabase = await createClient();
     const canUsePublicBooking = true;

     const [
          settings,
          onboardingRow,
          locationsResult,
          resourcesResult,
          servicesResult,
          locationHoursResult,
          resourceHoursResult,
          bookingRulesResult,
          publicBookingResult,
     ] = await Promise.all([
          getBusinessSettings(tenantId),
          supabase.from("tenant_onboarding").select("current_step, status").eq("tenant_id", tenantId).maybeSingle(),
          supabase.from("locations").select("id").eq("tenant_id", tenantId).eq("is_active", true),
          supabase.from("resources").select("id").eq("tenant_id", tenantId).eq("is_active", true),
          supabase.from("services").select("id").eq("tenant_id", tenantId).eq("is_active", true),
          supabase.from("location_working_hours").select("id, location_id").limit(1),
          supabase.from("resource_working_hours").select("id, tenant_id").eq("tenant_id", tenantId).limit(1),
          supabase.from("tenant_booking_rules").select("minimum_notice_minutes").eq("tenant_id", tenantId).maybeSingle(),
          supabase.from("tenant_public_booking_settings").select("is_enabled").eq("tenant_id", tenantId).maybeSingle(),
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
          plan: { canUsePublicBooking },
     });

     return {
          progress,
          summary: {
               locationCount: locationsResult.data?.length ?? 0,
               resourceCount: resourcesResult.data?.length ?? 0,
               serviceCount: servicesResult.data?.length ?? 0,
               hasLocationHours: (locationHoursResult.data?.length ?? 0) > 0,
               hasResourceHours: (resourceHoursResult.data?.length ?? 0) > 0,
               hasBookingRules: bookingRulesResult.data != null && (bookingRulesResult.data.minimum_notice_minutes ?? 0) > 0,
               hasPublicBookingSettings: publicBookingResult.data != null,
          },
          tenant: {
               name: settings.name,
               timezone: settings.defaultTimezone,
          },
          canUsePublicBooking,
     };
}
