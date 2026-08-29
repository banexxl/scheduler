import { createServiceRoleClient } from "@/lib/supabase/server";
import MarketingLandingPage from "@/features/marketing/components/landing-page";

export const metadata = {
  title: "Get Slot — Online Scheduling for Modern Businesses",
  description: "Powerful appointment scheduling platform. Manage bookings, payments, gift cards, packages, and recurring appointments — all in one place.",
  openGraph: {
    title: "Get Slot — Online Scheduling for Modern Businesses",
    description: "Powerful appointment scheduling platform for salons, clinics, studios, and service businesses.",
    type: "website",
  },
};

export default async function MarketingHomePage() {
  const supabase = createServiceRoleClient();

  // Load public billing plans
  const { data: plans } = await supabase
    .from("billing_plans" as never)
    .select("id, name, description, plan_key, is_free, is_active, is_public, sort_order" as never)
    .eq("is_active" as never, true)
    .eq("is_public" as never, true)
    .order("sort_order" as never, { ascending: true });

  // Load prices
  const planIds = ((plans ?? []) as unknown as Array<{ id: string }>).map(p => p.id);
  const priceMap = new Map<string, { amount: number; currency: string; billingInterval: string | null }>();

  if (planIds.length > 0) {
    const { data: prices } = await supabase
      .from("billing_plan_prices" as never)
      .select("billing_plan_id, amount, currency, billing_interval, is_active" as never)
      .in("billing_plan_id" as never, planIds)
      .eq("is_active" as never, true);

    for (const price of (prices ?? []) as unknown as Array<{
      billing_plan_id: string; amount: number | null; currency: string | null; billing_interval: string | null;
    }>) {
      if (!priceMap.has(price.billing_plan_id) && price.amount !== null) {
        priceMap.set(price.billing_plan_id, {
          amount: price.amount,
          currency: price.currency ?? "usd",
          billingInterval: price.billing_interval,
        });
      }
    }
  }

  const planData = ((plans ?? []) as unknown as Array<{
    id: string; name: string; description: string | null; plan_key: string; is_free: boolean;
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
      isFree: p.is_free,
    };
  });

  return <MarketingLandingPage plans={planData} />;
}
