import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import {
  normalizeTenantSlug,
  isValidTenantSlugFormat,
  isReservedTenantSlug,
} from "@/lib/tenants/validate-tenant-slug";

export type SlugAvailabilityResult = {
  status: "available" | "unavailable" | "invalid" | "error";
  available: boolean;
};

/**
 * Checks whether a business slug is available for use.
 *
 * Steps:
 * 1. Requires authenticated user
 * 2. Normalizes the slug
 * 3. Validates format and reserved-slug locally
 * 4. Calls the database RPC (is_tenant_slug_available) via normal server client
 * 5. Returns typed result — never exposes raw errors or tenant details
 *
 * Never uses the admin client. Respects the authenticated session.
 */
export async function checkBusinessSlugAvailability(
  slug: string
): Promise<SlugAvailabilityResult> {
  // 1. Require authenticated user
  const user = await getUser();
  if (!user) {
    return { status: "error", available: false };
  }

  // 2. Normalize
  const normalized = normalizeTenantSlug(slug);

  // 3. Local validation
  if (!normalized || !isValidTenantSlugFormat(normalized)) {
    return { status: "invalid", available: false };
  }

  if (isReservedTenantSlug(normalized)) {
    return { status: "invalid", available: false };
  }

  // 4. Database RPC check
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("is_tenant_slug_available", {
      candidate_slug: normalized,
    });

    if (error) {
      // Log sanitized error server-side only
      console.error(
        "[slug-availability] RPC error:",
        error.code,
        error.message
      );
      return { status: "error", available: false };
    }

    if (data === true) {
      return { status: "available", available: true };
    }

    return { status: "unavailable", available: false };
  } catch (err) {
    console.error("[slug-availability] Unexpected error:", err);
    return { status: "error", available: false };
  }
}
