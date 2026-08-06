import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "../types/service";

export async function getServices(tenantId: string, categoryId?: string | null): Promise<Service[]> {
  const supabase = await createClient();

  let query = supabase
    .from("services")
    .select("*, service_categories(name)")
    .eq("tenant_id", tenantId)
    .order("service_category_id", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (categoryId !== undefined) {
    if (categoryId === null) {
      query = query.is("service_category_id", null);
    } else {
      query = query.eq("service_category_id", categoryId);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error("Unable to load services");

  return (data ?? []).map((s) => {
    const cat = s.service_categories as unknown as { name: string } | null;
    return {
      id: s.id, tenantId: s.tenant_id, serviceCategoryId: s.service_category_id,
      categoryName: cat?.name ?? null, name: s.name, slug: s.slug, description: s.description,
      durationMinutes: s.duration_minutes, price: Number(s.price), currency: s.currency,
      bufferBeforeMinutes: s.buffer_before_minutes, bufferAfterMinutes: s.buffer_after_minutes,
      isActive: s.is_active, sortOrder: s.sort_order,
    };
  });
}

export async function getService(tenantId: string, serviceId: string): Promise<Service | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*, service_categories(name)")
    .eq("id", serviceId)
    .eq("tenant_id", tenantId)
    .single();

  if (!data) return null;
  const cat = data.service_categories as unknown as { name: string } | null;
  return {
    id: data.id, tenantId: data.tenant_id, serviceCategoryId: data.service_category_id,
    categoryName: cat?.name ?? null, name: data.name, slug: data.slug, description: data.description,
    durationMinutes: data.duration_minutes, price: Number(data.price), currency: data.currency,
    bufferBeforeMinutes: data.buffer_before_minutes, bufferAfterMinutes: data.buffer_after_minutes,
    isActive: data.is_active, sortOrder: data.sort_order,
  };
}
