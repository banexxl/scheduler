"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { resourceTypeSchema } from "../schemas/resource-type-schema";
import type { ResourceActionResult } from "./create-resource-type";

export async function updateResourceTypeAction(tenantSlug: string, typeId: string, values: Record<string, unknown>): Promise<ResourceActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { data: membership } = await supabase.from("tenant_members").select("id, role").eq("user_id", user.id).eq("tenant_id", tenant.id).eq("status", "active").single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return { success: false, message: "Only owners and admins can update resource types." };

  let validated: ReturnType<typeof resourceTypeSchema.validateSync>;
  try { validated = await resourceTypeSchema.validate(values, { abortEarly: false, stripUnknown: true }); }
  catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const fieldErrors: Record<string, string> = {};
      (error as { inner: Array<{ path?: string; message: string }> }).inner.forEach((e) => { if (e.path) fieldErrors[e.path] = e.message; });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  const { error } = await supabase.from("resource_types").update({
    name: validated.name.trim(),
    slug: validated.slug.trim().toLowerCase(),
    resource_kind: validated.resourceKind,
    display_name_singular: validated.displayNameSingular.trim(),
    display_name_plural: validated.displayNamePlural.trim(),
    description: validated.description ?? null,
    is_active: validated.isActive,
  }).eq("id", typeId).eq("tenant_id", tenant.id);

  if (error) {
    if (error.code === "23505") return { success: false, fieldErrors: { slug: "This slug is already in use." } };
    console.error("[update-resource-type]", error.code, error.message);
    return { success: false, message: "Unable to update resource type." };
  }

  revalidatePath(`/${tenantSlug}/resources/types`);
  return { success: true, message: "Resource type updated." };
}
