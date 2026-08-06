import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ResourceType, ResourceKind } from "../types/resource";

export async function getResourceTypes(tenantId: string): Promise<ResourceType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resource_types")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Unable to load resource types");

  return (data ?? []).map((rt) => ({
    id: rt.id,
    tenantId: rt.tenant_id,
    name: rt.name,
    slug: rt.slug,
    description: rt.description,
    resourceKind: rt.resource_kind as ResourceKind,
    displayNameSingular: rt.display_name_singular,
    displayNamePlural: rt.display_name_plural,
    isActive: rt.is_active,
    sortOrder: rt.sort_order,
  }));
}

export async function getResourceType(tenantId: string, typeId: string): Promise<ResourceType | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resource_types")
    .select("*")
    .eq("id", typeId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;
  return {
    id: data.id, tenantId: data.tenant_id, name: data.name, slug: data.slug,
    description: data.description, resourceKind: data.resource_kind as ResourceKind,
    displayNameSingular: data.display_name_singular, displayNamePlural: data.display_name_plural,
    isActive: data.is_active, sortOrder: data.sort_order,
  };
}
