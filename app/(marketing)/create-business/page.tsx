import { redirect } from "next/navigation";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { requireUser } from "@/lib/auth/require-user";
import { resolveUserIdentity } from "@/features/auth/services/resolve-user-identity";
import { createServiceRoleClient } from "@/lib/supabase/server";
import CreateBusinessWithPlanFlow from "@/features/business/components/create-business-with-plan-flow";
import type { PlanOption } from "@/features/business/components/plan-selection-step";

/**
 * Business creation onboarding page.
 *
 * Two-step flow:
 * 1. Select plan (free / trial / paid)
 * 2. Create business
 *
 * Route guard:
 * - Anonymous → /login (via requireUser)
 * - Active tenant member → /${tenantSlug}/dashboard (prevents re-onboarding)
 * - Platform admin → allowed
 * - Customer-only user → allowed
 * - New user with no relationships → allowed
 */
export default async function CreateBusinessPage() {
  const user = await requireUser();
  const identity = await resolveUserIdentity(user);

  // Prevent existing business members from re-onboarding
  const accessible = identity.tenantMemberships
    .filter((m) => m.tenantStatus === "active")
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));

  if (accessible.length > 0) {
    redirect(`/${accessible[0]!.tenantSlug}/dashboard`);
  }

  // Load available plans from billing_plans (where Polar products are synced)
  const supabase = createServiceRoleClient();
  const { data: planRows } = await supabase
    .from("billing_plans" as never)
    .select("id, name, description, plan_key, is_free, is_active, is_public, polar_product_id, sort_order, trial_days" as never)
    .eq("is_active" as never, true)
    .eq("is_public" as never, true)
    .order("sort_order" as never, { ascending: true });

  // Load prices
  const planIds = ((planRows ?? []) as unknown as Array<{ id: string }>).map(p => p.id);
  const priceMap = new Map<string, { amount: number; currency: string; billingInterval: string | null }>();

  if (planIds.length > 0) {
    const { data: prices } = await supabase
      .from("billing_plan_prices" as never)
      .select("billing_plan_id, amount, currency, billing_interval, is_active" as never)
      .in("billing_plan_id" as never, planIds)
      .eq("is_active" as never, true);

    for (const price of (prices ?? []) as unknown as Array<{ billing_plan_id: string; amount: number | null; currency: string | null; billing_interval: string | null }>) {
      if (!priceMap.has(price.billing_plan_id) && price.amount !== null) {
        priceMap.set(price.billing_plan_id, {
          amount: price.amount,
          currency: price.currency ?? "usd",
          billingInterval: price.billing_interval,
        });
      }
    }
  }

  const plans: PlanOption[] = ((planRows ?? []) as unknown as Array<{
    id: string; name: string; description: string | null; plan_key: string;
    is_free: boolean; polar_product_id: string | null; trial_days: number | null;
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
      trialDays: p.is_free ? 0 : (p.trial_days ?? 0),
      polarProductId: p.polar_product_id ?? null,
    };
  });

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 6 } }}>
      <CreateBusinessWithPlanFlow plans={plans} />

      {/* Footer links */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mt: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Signed in as {user.email}
        </Typography>
      </Box>
    </Container>
  );
}
