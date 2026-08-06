import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ServiceCategory } from "../types/service-category";

export async function getServiceCategories(tenantId: string): Promise<ServiceCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Unable to load service categories");

  return (data ?? []).map((c) => ({
    id: c.id, tenantId: c.tenant_id, name: c.name, slug: c.slug,
    description: c.description, isActive: c.is_active, sortOrder: c.sort_order,
  }));
}

export async function getServiceCategory(tenantId: string, categoryId: string): Promise<ServiceCategory | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_categories")
    .select("*")
    .eq("id", categoryId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;
  return {
    id: data.id, tenantId: data.tenant_id, name: data.name, slug: data.slug,
    description: data.description, isActive: data.is_active, sortOrder: data.sort_order,
  };
}
