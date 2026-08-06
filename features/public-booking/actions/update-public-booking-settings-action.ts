"use server";

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createClient } from "@/lib/supabase/server";
import type { PublicBookingSettings } from "../types/public-booking";

type Result = { success: true } | { success: false; error: string };

export async function updatePublicBookingSettingsAction(
  tenantSlug: string,
  settings: PublicBookingSettings
): Promise<Result> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);

    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("tenant_public_booking_settings")
      .upsert({
        tenant_id: tenant.id,
        is_enabled: settings.isEnabled,
        allow_resource_selection: settings.allowResourceSelection,
        allow_no_preference: settings.allowNoPreference,
        show_service_prices: settings.showServicePrices,
        show_service_duration: settings.showServiceDuration,
        show_resource_names: settings.showResourceNames,
        booking_page_title: settings.bookingPageTitle,
        booking_page_description: settings.bookingPageDescription,
        confirmation_message: settings.confirmationMessage,
      } as never, { onConflict: "tenant_id" });

    if (error) {
      console.error("[update-public-booking-settings] Error:", error.message);
      return { success: false, error: "Failed to save settings." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save settings." };
  }
}
