import "server-only";

/**
 * Public tenant resolution — Milestone 6.11.
 *
 * Resolves a tenant by public slug for the booking flow.
 * Returns only public-safe fields. Does not require authentication.
 * Uses service-role or a dedicated public-safe query approach.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  PublicBookingTenant,
  PublicBookingSettings,
} from "../types/public-booking";
import { DEFAULT_PUBLIC_BOOKING_SETTINGS } from "../types/public-booking";

// ─── Resolve Public Tenant ───────────────────────────────────────────────────

/**
 * Resolves a tenant by slug for public booking.
 * Returns null if tenant doesn't exist or is not active.
 */
export async function resolvePublicTenant(
  slug: string
): Promise<PublicBookingTenant | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenants")
    .select("id, slug, name, default_timezone, description")
    .eq("slug", slug)
    .in("status", ["active", "trialing"])
    .single();

  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    defaultTimeZone: data.default_timezone,
    logoUrl: null,
    coverUrl: null,
    description: data.description ?? null,
  };
}

// ─── Get Public Booking Settings ─────────────────────────────────────────────

/**
 * Loads the public booking settings for a tenant.
 * Returns defaults when no row exists (booking disabled).
 */
export async function getPublicBookingSettings(
  tenantId: string
): Promise<PublicBookingSettings> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_public_booking_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return DEFAULT_PUBLIC_BOOKING_SETTINGS;

  const row = data as Record<string, unknown>;
  return {
    isEnabled: row.is_enabled as boolean,
    allowResourceSelection: row.allow_resource_selection as boolean,
    allowNoPreference: row.allow_no_preference as boolean,
    showServicePrices: row.show_service_prices as boolean,
    showServiceDuration: row.show_service_duration as boolean,
    showResourceNames: row.show_resource_names as boolean,
    bookingPageTitle: (row.booking_page_title as string) ?? null,
    bookingPageDescription: (row.booking_page_description as string) ?? null,
    confirmationMessage: (row.confirmation_message as string) ?? null,
  };
}

// ─── Combined Resolution ─────────────────────────────────────────────────────

export type PublicBookingContext = {
  tenant: PublicBookingTenant;
  settings: PublicBookingSettings;
};

/**
 * Resolves a public booking context: tenant + settings.
 * Returns null if tenant doesn't exist, is inactive, or booking is disabled.
 */
export async function resolvePublicBookingContext(
  slug: string
): Promise<PublicBookingContext | null> {
  const tenant = await resolvePublicTenant(slug);
  if (!tenant) return null;

  const settings = await getPublicBookingSettings(tenant.id);
  if (!settings.isEnabled) return null;

  return { tenant, settings };
}
