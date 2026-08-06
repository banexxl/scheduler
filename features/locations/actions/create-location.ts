"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { locationSchema } from "../schemas/location-schema";
import { normalizeLocationSlug } from "../utils/location-slug";

export type LocationActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Creates a new location for the authorized tenant.
 * Requires owner or admin role.
 */
export async function createLocationAction(
  tenantSlug: string,
  values: Record<string, unknown>
): Promise<LocationActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || tenant.status !== "active") {
    return { success: false, message: "Business not found." };
  }

  const supabase = await createClient();

  // Verify owner/admin role
  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can create locations." };
  }

  // Validate
  let validated: ReturnType<typeof locationSchema.validateSync>;
  try {
    validated = await locationSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as { inner: Array<{ path?: string; message: string }> };
      const fieldErrors: Record<string, string> = {};
      yupError.inner.forEach((err) => {
        if (err.path) fieldErrors[err.path] = err.message;
      });
      return { success: false, fieldErrors };
    }
    return { success: false, message: "Invalid form data." };
  }

  const normalizedSlug = normalizeLocationSlug(validated.slug);

  // Check slug uniqueness within tenant
  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      fieldErrors: { slug: "Another location in this business already uses this address." },
    };
  }

  // Determine sort_order
  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const sortOrder = (count ?? 0) + 1;

  // Insert
  const { error: insertError } = await supabase.from("locations").insert({
    tenant_id: tenant.id,
    name: validated.name.trim(),
    slug: normalizedSlug,
    location_type: validated.locationType,
    description: validated.description ?? null,
    street_address: validated.streetAddress ?? null,
    city: validated.city ?? null,
    province_state: validated.provinceState ?? null,
    country: validated.country ?? null,
    postal_code: validated.postalCode ?? null,
    phone_number: validated.phoneNumber ?? null,
    email: validated.email ?? null,
    timezone: validated.timezone,
    is_active: validated.isActive,
    is_primary: false,
    sort_order: sortOrder,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        success: false,
        fieldErrors: { slug: "Another location in this business already uses this address." },
      };
    }
    console.error("[create-location] Insert error:", insertError.code, insertError.message);
    return { success: false, message: "Unable to create location. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/dashboard`);
  redirect(`/${tenantSlug}/locations`);
}
