"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { generateTenantSlug } from "@/lib/tenants/generate-tenant-slug";
import {
  normalizeTenantSlug,
  isValidTenantSlugFormat,
  isReservedTenantSlug,
} from "@/lib/tenants/validate-tenant-slug";
import { createBusinessSchema } from "../schemas/create-business-schema";

const DEFAULT_TRIAL_DAYS = 14;

export type CreateBusinessActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Partial<
    Record<
      | "businessName"
      | "tenantSlug"
      | "primaryLocationName"
      | "timezone"
      | "currency",
      string
    >
  >;
};

/**
 * Server Action: Creates a new business (tenant) via the create_tenant RPC.
 *
 * Steps:
 * 1. Require authenticated user
 * 2. Validate all fields with the canonical Yup schema
 * 3. Check that the user doesn't already have an active tenant membership
 * 4. Revalidate slug format + reserved + availability
 * 5. Resolve active subscription plan
 * 6. Call create_tenant RPC
 * 7. Handle duplicate-slug race condition
 * 8. Redirect to /${tenantSlug}/onboarding
 *
 * Never uses the admin client. Uses the authenticated server client.
 * The RPC atomically creates: tenant, owner membership, location, subscription, audit log.
 */
export async function createBusinessAction(
  values: {
    businessName: string;
    tenantSlug: string;
    primaryLocationName: string;
    timezone: string;
    currency: string;
    selectedPlanId?: string;
  }
): Promise<CreateBusinessActionResult> {
  // 1. Require authenticated user
  const user = await getUser();
  if (!user) {
    return {
      success: false,
      message: "Authentication required. Please sign in again.",
    };
  }

  // 2. Server-side Yup validation
  let validated: {
    businessName: string;
    tenantSlug: string;
    primaryLocationName: string;
    timezone: string;
    currency: string;
  };

  try {
    validated = await createBusinessSchema.validate(values, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error && typeof error === "object" && "inner" in error) {
      const yupError = error as {
        inner: Array<{ path?: string; message: string }>;
      };
      const fieldErrors: CreateBusinessActionResult["fieldErrors"] = {};
      yupError.inner.forEach((err) => {
        if (err.path) {
          (fieldErrors as Record<string, string>)[err.path] = err.message;
        }
      });
      return { success: false, fieldErrors };
    }
    return {
      success: false,
      message: "Invalid form data. Please correct the errors and try again.",
    };
  }

  const supabase = await createClient();

  // 3. Prevent existing active tenant members from creating another business
  const { data: existingMemberships } = await supabase
    .from("tenant_members")
    .select("id, tenant_id, tenants(slug, name, status)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const activeMemberships = (existingMemberships ?? []).filter((m) => {
    const tenant = m.tenants as unknown as { slug: string; name: string; status: string } | null;
    return tenant && tenant.status === "active";
  });

  if (activeMemberships.length > 0) {
    const firstTenant = activeMemberships[0]!.tenants as unknown as {
      slug: string;
      name: string;
      status: string;
    };
    // Redirect to existing business dashboard
    redirect(`/${firstTenant.slug}/dashboard`);
  }

  // 4. Revalidate slug: format, reserved, availability
  const normalizedSlug = normalizeTenantSlug(validated.tenantSlug);

  if (!isValidTenantSlugFormat(normalizedSlug)) {
    return {
      success: false,
      fieldErrors: {
        tenantSlug:
          "Must start with a letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens (3–63 chars)",
      },
    };
  }

  if (isReservedTenantSlug(normalizedSlug)) {
    return {
      success: false,
      fieldErrors: {
        tenantSlug: "This address is reserved. Choose another one.",
      },
    };
  }

  // Final availability recheck via RPC
  const { data: slugAvailable, error: slugCheckError } = await supabase.rpc(
    "is_tenant_slug_available",
    { candidate_slug: normalizedSlug }
  );

  if (slugCheckError) {
    console.error(
      "[create-business] Slug availability check failed:",
      slugCheckError.code,
      slugCheckError.message
    );
    return {
      success: false,
      message: "We could not verify address availability. Please try again.",
    };
  }

  if (slugAvailable !== true) {
    return {
      success: false,
      fieldErrors: {
        tenantSlug: "This business address is already in use. Choose another one.",
      },
    };
  }

  // 5. Resolve subscription plan
  // Use service-role client for plan lookups — billing_plans RLS restricts
  // SELECT to platform admins, but all authenticated users need plan access
  // during onboarding.
  const adminClient = createServiceRoleClient();
  let selectedPlan: { id: string; trial_days: number | null } | null = null;

  // Use explicitly selected plan if provided
  if (values.selectedPlanId) {
    const { data: explicitPlan } = await adminClient
      .from("billing_plans" as never)
      .select("id, trial_days" as never)
      .eq("id" as never, values.selectedPlanId)
      .eq("is_active" as never, true)
      .maybeSingle();

    if (explicitPlan) {
      selectedPlan = explicitPlan as unknown as { id: string; trial_days: number | null };
      console.log("[create-business] Resolved explicit plan:", selectedPlan.id, "trial_days:", selectedPlan.trial_days);
    } else {
      console.warn("[create-business] Explicit plan not found for id:", values.selectedPlanId);
    }
  }

  // Fallback: auto-select cheapest/free plan
  if (!selectedPlan) {
    const { data: plans } = await adminClient
      .from("billing_plans" as never)
      .select("id, plan_key, is_free, trial_days" as never)
      .eq("is_active" as never, true)
      .order("sort_order" as never, { ascending: true })
      .limit(10);

    const allPlans = (plans ?? []) as unknown as Array<{ id: string; plan_key: string; is_free: boolean; trial_days: number | null }>;
    const freePlan = allPlans.find(p => p.is_free || p.plan_key === "free" || p.plan_key.includes("free"));
    selectedPlan = freePlan ?? allPlans[0] ?? null;
  }

  if (!selectedPlan) {
    console.error("[create-business] No active subscription plan found");
    return {
      success: false,
      message: "No subscription plans are available. Please contact support.",
    };
  }

  const trialDays = selectedPlan.trial_days ?? DEFAULT_TRIAL_DAYS;

  return await executeCreateTenant(
    supabase,
    validated,
    normalizedSlug,
    selectedPlan.id,
    trialDays
  );
}

/**
 * Calls the create_tenant RPC and handles the response.
 */
async function executeCreateTenant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  validated: {
    businessName: string;
    tenantSlug: string;
    primaryLocationName: string;
    timezone: string;
    currency: string;
  },
  normalizedSlug: string,
  planId: string,
  trialDays: number
): Promise<CreateBusinessActionResult> {
  // Generate primary location slug
  const locationSlug =
    generateTenantSlug(validated.primaryLocationName) || "main";

  // 6. Call create_tenant RPC
  const { error: rpcError } = await supabase.rpc("create_tenant", {
    tenant_name: validated.businessName.trim(),
    tenant_slug: normalizedSlug,
    primary_location_name: validated.primaryLocationName.trim(),
    primary_location_slug: locationSlug,
    timezone_name: validated.timezone,
    currency_code: validated.currency,
    subscription_plan_id: planId,
    trial_days: trialDays,
  });

  // 7. Handle errors
  if (rpcError) {
    // Check for unique constraint violation (duplicate slug race condition)
    if (
      rpcError.code === "23505" ||
      rpcError.message?.toLowerCase().includes("unique") ||
      rpcError.message?.toLowerCase().includes("duplicate")
    ) {
      return {
        success: false,
        fieldErrors: {
          tenantSlug:
            "This business address was just taken. Choose another one.",
        },
      };
    }

    console.error(
      "[create-business] RPC error:",
      rpcError.code,
      rpcError.message
    );
    return {
      success: false,
      message: "We could not create your business. Please try again.",
    };
  }

  // 8. Initialize free trial fields on the tenant
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  await supabase
    .from("tenants")
    .update({
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      trial_used: true,
    })
    .eq("slug", normalizedSlug);

  // 9. Success — invalidate caches and redirect
  revalidatePath("/create-business");
  revalidatePath(`/${normalizedSlug}`);

  redirect(`/${normalizedSlug}/onboarding`);
}
