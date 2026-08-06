import "server-only";
import { createClient } from "@/lib/supabase/server";

export type LocationListItem = {
  id: string;
  name: string;
  slug: string;
  locationType: string;
  city: string | null;
  country: string | null;
  timezone: string;
  phoneNumber: string | null;
  email: string | null;
  streetAddress: string | null;
  isPrimary: boolean;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Loads all locations for an authorized tenant, ordered by:
 * is_primary DESC, sort_order ASC, name ASC
 */
export async function getBusinessLocations(
  tenantId: string
): Promise<LocationListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("locations")
    .select(
      "id, name, slug, location_type, city, country, timezone, phone_number, email, street_address, is_primary, is_active, sort_order"
    )
    .eq("tenant_id", tenantId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Unable to load locations");
  }

  return (data ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    slug: loc.slug,
    locationType: loc.location_type,
    city: loc.city,
    country: loc.country,
    timezone: loc.timezone,
    phoneNumber: loc.phone_number,
    email: loc.email,
    streetAddress: loc.street_address,
    isPrimary: loc.is_primary,
    isActive: loc.is_active,
    sortOrder: loc.sort_order,
  }));
}
