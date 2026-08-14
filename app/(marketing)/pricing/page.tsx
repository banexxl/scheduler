import { createServiceRoleClient } from "@/lib/supabase/server";
import PricingPageClient from "@/features/marketing/components/pricing-page";

export const metadata = {
  title: "Pricing — Get Slot",
  description: "Simple, transparent pricing for businesses of all sizes. Start free, upgrade when you're ready.",
};

export default async function PricingPage() {
  const supabase = createServiceRoleClient();

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, name, description, code, price_amount, currency, billing_interval, is_active")
    .eq("is_active", true)
    .order("price_amount", { ascending: true });

  const planData = ((plans ?? []) as unknown as Array<{
    id: string; name: string; description: string | null; code: string;
    price_amount: number; currency: string; billing_interval: string | null;
  }>).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    code: p.code,
    priceAmount: p.price_amount,
    currency: p.currency,
    billingInterval: p.billing_interval,
    isFree: p.price_amount === 0,
  }));

  return <PricingPageClient plans={planData} />;
}
