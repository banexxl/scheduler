import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Resource, ResourceKind, ResourceLocationAssignment } from "../types/resource";

export async function getBusinessResources(tenantId: string): Promise<Resource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resources")
    .select("*, resource_types(name, resource_kind), resource_locations(id, location_id, is_primary, is_active, locations(name))")
    .eq("tenant_id", tenantId)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Unable to load resources");

  return (data ?? []).map((r) => {
    const rt = r.resource_types as unknown as { name: string; resource_kind: string } | null;
    const locs = (r.resource_locations as unknown as Array<{
      id: string; location_id: string; is_primary: boolean; is_active: boolean;
      locations: { name: string } | null;
    }>) ?? [];

    const locations: ResourceLocationAssignment[] = locs.map((l) => ({
      id: l.id,
      locationId: l.location_id,
      locationName: l.locations?.name ?? "Unknown",
      isPrimary: l.is_primary,
      isActive: l.is_active,
    }));

    return {
      id: r.id,
      tenantId: r.tenant_id,
      resourceTypeId: r.resource_type_id,
      resourceTypeName: rt?.name ?? "Unknown",
      resourceKind: (rt?.resource_kind ?? "other") as ResourceKind,
      name: r.name,
      slug: r.slug,
      description: r.description,
      email: r.email,
      phoneNumber: r.phone_number,
      isActive: r.is_active,
      sortOrder: r.sort_order,
      locations,
    };
  });
}

export async function getResource(tenantId: string, resourceId: string): Promise<Resource | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("*, resource_types(name, resource_kind), resource_locations(id, location_id, is_primary, is_active, locations(name))")
    .eq("id", resourceId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;

  const rt = data.resource_types as unknown as { name: string; resource_kind: string } | null;
  const locs = (data.resource_locations as unknown as Array<{
    id: string; location_id: string; is_primary: boolean; is_active: boolean;
    locations: { name: string } | null;
  }>) ?? [];

  return {
    id: data.id,
    tenantId: data.tenant_id,
    resourceTypeId: data.resource_type_id,
    resourceTypeName: rt?.name ?? "Unknown",
    resourceKind: (rt?.resource_kind ?? "other") as ResourceKind,
    name: data.name,
    slug: data.slug,
    description: data.description,
    email: data.email,
    phoneNumber: data.phone_number,
    isActive: data.is_active,
    sortOrder: data.sort_order,
    locations: locs.map((l) => ({
      id: l.id, locationId: l.location_id, locationName: l.locations?.name ?? "Unknown",
      isPrimary: l.is_primary, isActive: l.is_active,
    })),
  };
}
