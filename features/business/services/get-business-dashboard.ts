import "server-only";
import { createClient } from "@/lib/supabase/server";

export type BusinessDashboardData = {
  business: {
    id: string;
    name: string;
    slug: string;
    status: string;
    defaultTimezone: string;
    defaultCurrency: string;
    createdAt: string;
  };
  primaryLocation: {
    id: string;
    name: string;
    slug: string;
    locationType: string;
    timezone: string;
    city: string | null;
    country: string | null;
  } | null;
  subscription: {
    status: string;
    planName: string | null;
    billingInterval: string | null;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  counts: {
    locations: number;
    activeTeamMembers: number;
    customers: number;
  };
};

/**
 * Loads dashboard data for an already-authorized tenant.
 *
 * The tenantId must come from a prior authorization check (e.g. requireTenantMember).
 * Uses the normal authenticated server client — never the admin client.
 * Loads independent data in parallel for performance.
 */
export async function getBusinessDashboard(
  tenantId: string
): Promise<BusinessDashboardData> {
  const supabase = await createClient();

  // Load all independent data in parallel
  const [
    tenantResult,
    primaryLocationResult,
    subscriptionResult,
    locationCountResult,
    teamCountResult,
    customerCountResult,
  ] = await Promise.all([
    // Tenant details
    supabase
      .from("tenants")
      .select(
        "id, name, slug, status, default_timezone, default_currency, created_at"
      )
      .eq("id", tenantId)
      .single(),

    // Primary location
    supabase
      .from("locations")
      .select("id, name, slug, location_type, timezone, city, country")
      .eq("tenant_id", tenantId)
      .eq("is_primary", true)
      .maybeSingle(),

    // Subscription with plan info
    supabase
      .from("tenant_subscriptions")
      .select(
        "status, trial_ends_at, current_period_ends_at, cancel_at_period_end, subscription_plans(name, billing_interval)"
      )
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle(),

    // Location count
    supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),

    // Active team member count
    supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active"),

    // Customer count
    supabase
      .from("tenant_customers")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  // Map tenant data
  const tenant = tenantResult.data;
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Map primary location
  const primaryLocation = primaryLocationResult.data
    ? {
        id: primaryLocationResult.data.id,
        name: primaryLocationResult.data.name,
        slug: primaryLocationResult.data.slug,
        locationType: primaryLocationResult.data.location_type,
        timezone: primaryLocationResult.data.timezone,
        city: primaryLocationResult.data.city,
        country: primaryLocationResult.data.country,
      }
    : null;

  // Map subscription
  let subscription: BusinessDashboardData["subscription"] = null;
  if (subscriptionResult.data) {
    const sub = subscriptionResult.data;
    const plan = sub.subscription_plans as unknown as {
      name: string;
      billing_interval: string;
    } | null;

    subscription = {
      status: sub.status,
      planName: plan?.name ?? null,
      billingInterval: plan?.billing_interval ?? null,
      trialEndsAt: sub.trial_ends_at,
      currentPeriodEndsAt: sub.current_period_ends_at,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  return {
    business: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      defaultTimezone: tenant.default_timezone,
      defaultCurrency: tenant.default_currency,
      createdAt: tenant.created_at,
    },
    primaryLocation,
    subscription,
    counts: {
      locations: locationCountResult.count ?? 0,
      activeTeamMembers: teamCountResult.count ?? 0,
      customers: customerCountResult.count ?? 0,
    },
  };
}
