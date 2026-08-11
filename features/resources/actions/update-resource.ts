"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { resourceSchema } from "../schemas/resource-schema";
import type { ResourceActionResult } from "./create-resource-type";

export async function updateResourceAction(tenantSlug: string, resourceId: string, values: Record<string, unknown>): Promise<ResourceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can update resources." };

  // Verify resource belongs to tenant
  const { data: resource } = await supabase.from("resources").select("id").eq("id", resourceId).eq("tenant_id", tenant.id).single();
  if (!resource) return { success: false, message: "Resource not found." };

  let validated: ReturnType<typeof resourceSchema.validateSync>;
  try { validated = await resourceSchema.validate(values, { abortEarly: false, stripUnknown: true }); }
  catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => { if (e.path) fieldErrors[e.path] = e.message; });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  // Update resource fields
  const { error: updateError } = await supabase.from("resources").update({
    name: validated.name.trim(),
    slug: validated.slug.trim().toLowerCase(),
    resource_type_id: validated.resourceTypeId,
    description: validated.description ?? null,
    email: validated.email ?? null,
    phone_number: validated.phoneNumber ?? null,
    is_active: validated.isActive,
  }).eq("id", resourceId).eq("tenant_id", tenant.id);

  if (updateError) {
    if (updateError.code === "23505") return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    console.error("[update-resource]", updateError.code, updateError.message);
    return { success: false, message: "Unable to update resource." };
  }

  // Sync location assignments: delete removed, add new, update primary
  const { data: currentAssignments } = await supabase.from("resource_locations").select("id, location_id").eq("resource_id", resourceId);
  const currentLocationIds = new Set((currentAssignments ?? []).map((a) => a.location_id));
  const newLocationIds = new Set(validated.locationIds as string[]);

  // Delete removed assignments
  for (const a of currentAssignments ?? []) {
    if (!newLocationIds.has(a.location_id)) {
      await supabase.from("resource_locations").delete().eq("id", a.id);
    }
  }

  // Add new assignments
  for (const locId of validated.locationIds as string[]) {
    if (!currentLocationIds.has(locId)) {
      await supabase.from("resource_locations").insert({ tenant_id: tenant.id, resource_id: resourceId, location_id: locId, is_primary: false, is_active: true });
    }
  }

  // Set primary
  await supabase.from("resource_locations").update({ is_primary: false }).eq("resource_id", resourceId);
  await supabase.from("resource_locations").update({ is_primary: true }).eq("resource_id", resourceId).eq("location_id", validated.primaryLocationId);

  revalidatePath(`/${tenantSlug}/resources`);
  revalidatePath(`/${tenantSlug}/dashboard`);
  return { success: true, message: "Resource updated." };
}
