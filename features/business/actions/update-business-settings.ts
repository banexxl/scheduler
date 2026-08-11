"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { updateBusinessSettingsSchema } from "../schemas/update-business-settings-schema";

export type UpdateBusinessSettingsResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Server Action: Updates business settings for an authorized owner or admin.
 *
 * Steps:
 * 1. Require authenticated user
 * 2. Resolve tenant by slug
 * 3. Verify active membership with owner or admin role
 * 4. Validate submitted values with canonical Yup schema
 * 5. Update only allowed columns (explicit payload)
 * 6. Never updates: id, slug, status, created_by, created_at
 * 7. Revalidate paths
 *
 * Never uses admin client. Uses authenticated server client with RLS.
 */
export async function updateBusinessSettingsAction(
  tenantSlug: string,
  values: Record<string, unknown>
): Promise<UpdateBusinessSettingsResult> {
  // 1. Require authenticated user
  const user = await getUser();
  if (!user) {
    return {
      success: false,
      message: "Authentication required. Please sign in again.",
    };
  }

  // 2. Resolve tenant
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active","trialing"].includes(tenant.status)) {
    return {
      success: false,
      message: "Business not found.",
    };
  }

  // 3. Verify active membership with owner or admin role
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role, status")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("status", "active")
    .single();

  if (!membership) {
    return {
      success: false,
      message: "You do not have access to this business.",
    };
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return {
      success: false,
      message: "Only owners and admins can update business settings.",
    };
  }

  // 4. Validate with canonical schema
  let validated: {
    name: string;
    contactEmail?: string;
    contactPhone?: string;
    defaultTimezone: string;
    defaultCurrency: string;
    description?: string;
    websiteUrl?: string;
    defaultLanguage: string;
    socialLinks?: Record<string, string | undefined>;
  };

  try {
    validated = await updateBusinessSettingsSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as {
        inner: Array<{ path?: string; message: string }>;
      };
      const fieldErrors: Record<string, string> = {};
      yupError.inner.forEach((err) => {
        if (err.path) {
          fieldErrors[err.path] = err.message;
        }
      });
      return { success: false, fieldErrors };
    }
    return {
      success: false,
      message: "Invalid form data. Please correct the errors and try again.",
    };
  }

  // 5. Build explicit update payload — prevent mass assignment
  const socialLinksClean: Record<string, string> = {};
  if (validated.socialLinks) {
    for (const [key, val] of Object.entries(validated.socialLinks)) {
      if (val && val.trim()) {
        socialLinksClean[key] = val.trim();
      }
    }
  }

  const updatePayload = {
    name: validated.name.trim(),
    contact_email: validated.contactEmail ?? null,
    contact_phone: validated.contactPhone ?? null,
    default_timezone: validated.defaultTimezone,
    default_currency: validated.defaultCurrency,
    description: validated.description ?? null,
    website_url: validated.websiteUrl ?? null,
    default_language: validated.defaultLanguage,
    social_links: socialLinksClean,
  };

  // 6. Update
  const { error: updateError } = await supabase
    .from("tenants")
    .update(updatePayload)
    .eq("id", tenant.id);

  if (updateError) {
    console.error(
      "[update-business-settings] Update error:",
      updateError.code,
      updateError.message
    );
    return {
      success: false,
      message: "Unable to save settings. Please try again.",
    };
  }

  // 7. Revalidate paths
  revalidatePath(`/${tenantSlug}/settings`);
  revalidatePath(`/${tenantSlug}/dashboard`);

  return {
    success: true,
    message: "Settings saved successfully.",
  };
}
