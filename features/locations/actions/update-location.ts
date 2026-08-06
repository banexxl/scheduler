"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { locationSchema } from "../schemas/location-schema";
import { normalizeLocationSlug } from "../utils/location-slug";
import type { LocationActionResult } from "./create-location";

/**
 * Updates an existing location. Requires owner or admin role.
 */
export async function updateLocationAction(
  tenantSlug: string,
  locationId: string,
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

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { success: false, message: "Only owners and admins can update locations." };
  }

  // Verify location belongs to tenant
  const { data: location } = await supabase
    .from("locations")
    .select("id, tenant_id")
    .eq("id", locationId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!location) {
    return { success: false, message: "Location not found." };
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

  // Check slug uniqueness excluding current location
  const { data: duplicateSlug } = await supabase
    .from("locations")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("slug", normalizedSlug)
    .neq("id", locationId)
    .maybeSingle();

  if (duplicateSlug) {
    return {
      success: false,
      fieldErrors: { slug: "Another location in this business already uses this address." },
    };
  }

  // Update (explicit payload)
  const { error: updateError } = await supabase
    .from("locations")
    .update({
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
    })
    .eq("id", locationId)
    .eq("tenant_id", tenant.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return {
        success: false,
        fieldErrors: { slug: "Another location in this business already uses this address." },
      };
    }
    console.error("[update-location] Error:", updateError.code, updateError.message);
    return { success: false, message: "Unable to update location. Please try again." };
  }

  revalidatePath(`/${tenantSlug}/locations`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  return { success: true, message: "Location updated successfully." };
}
