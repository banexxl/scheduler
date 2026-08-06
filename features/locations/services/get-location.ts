import "server-only";
import { createClient } from "@/lib/supabase/server";

export type LocationDetail = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  locationType: string;
  description: string | null;
  streetAddress: string | null;
  city: string | null;
  provinceState: string | null;
  country: string | null;
  postalCode: string | null;
  phoneNumber: string | null;
  email: string | null;
  timezone: string;
  isPrimary: boolean;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Loads a single location by ID for the authorized tenant.
 */
export async function getLocation(
  tenantId: string,
  locationId: string
): Promise<LocationDetail | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("locations")
    .select(
      "id, tenant_id, name, slug, location_type, description, street_address, city, province_state, country, postal_code, phone_number, email, timezone, is_primary, is_active, sort_order"
    )
    .eq("id", locationId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    slug: data.slug,
    locationType: data.location_type,
    description: data.description,
    streetAddress: data.street_address,
    city: data.city,
    provinceState: data.province_state,
    country: data.country,
    postalCode: data.postal_code,
    phoneNumber: data.phone_number,
    email: data.email,
    timezone: data.timezone,
    isPrimary: data.is_primary,
    isActive: data.is_active,
    sortOrder: data.sort_order,
  };
}
