import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { resolveUserIdentity } from "@/features/auth/services/resolve-user-identity";
import PricingPageClient from "@/features/marketing/components/pricing-page";

export const metadata = {
  title: "Pricing — Get Slot",
  description: "Simple, transparent pricing for businesses of all sizes. Start free, upgrade when you're ready.",
};

export default async function PricingPage() {
  const supabase = createServiceRoleClient();

  // Load plans
  const { data: plans } = await supabase
    .from("billing_plans" as never)
    .select("id, name, description, plan_key, is_free, is_active, is_public, polar_product_id, sort_order, features" as never)
    .eq("is_active" as never, true)
    .eq("is_public" as never, true)
    .order("sort_order" as never, { ascending: true });

  // Load prices for each plan
  const planIds = ((plans ?? []) as unknown as Array<{ id: string }>).map(p => p.id);
  const priceMap = new Map<string, { amount: number; currency: string; billingInterval: string | null; billingIntervalCount: number }>();

  if (planIds.length > 0) {
    const { data: prices } = await supabase
      .from("billing_plan_prices" as never)
      .select("billing_plan_id, amount, currency, billing_interval, billing_interval_count, is_active" as never)
      .in("billing_plan_id" as never, planIds)
      .eq("is_active" as never, true);

    for (const price of (prices ?? []) as unknown as Array<{ billing_plan_id: string; amount: number | null; currency: string | null; billing_interval: string | null; billing_interval_count: number | null }>) {
      if (!priceMap.has(price.billing_plan_id) && price.amount !== null) {
        priceMap.set(price.billing_plan_id, {
          amount: price.amount,
          currency: price.currency ?? "usd",
          billingInterval: price.billing_interval,
          billingIntervalCount: price.billing_interval_count ?? 1,
        });
      }
    }
  }

  const planData = ((plans ?? []) as unknown as Array<{
    id: string; name: string; description: string | null; plan_key: string;
    is_free: boolean; polar_product_id: string | null; features: string[] | null;
  }>).map(p => {
    const price = priceMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      code: p.plan_key,
      priceAmount: price?.amount ?? 0,
      currency: price?.currency ?? "usd",
      billingInterval: price?.billingInterval ?? null,
      billingIntervalCount: price?.billingIntervalCount ?? 1,
      isFree: p.is_free,
      features: Array.isArray(p.features) ? p.features : [],
    };
  });

  // Resolve current user's active plan (if logged in)
  let currentPlanKey: string | null = null;
  try {
    const user = await getUser();
    if (user) {
      const identity = await resolveUserIdentity(user);
      const firstTenant = identity.tenantMemberships
        .filter(m => m.tenantStatus === "active" || m.tenantStatus === "trialing")
        .sort((a, b) => a.tenantName.localeCompare(b.tenantName))[0];

      if (firstTenant) {
        const { data: sub } = await supabase
          .from("tenant_subscriptions" as never)
          .select("billing_plans(plan_key)" as never)
          .eq("tenant_id" as never, firstTenant.tenantId)
          .in("access_state" as never, ["trial", "active", "grace_period"] as never)
          .limit(1)
          .single();

        if (sub) {
          const row = sub as unknown as { billing_plans: { plan_key: string } | null };
          currentPlanKey = row.billing_plans?.plan_key ?? null;
        }
      }
    }
  } catch {
    // Not logged in or no subscription — fine
  }

  return <PricingPageClient plans={planData} currentPlanKey={currentPlanKey} />;
}
