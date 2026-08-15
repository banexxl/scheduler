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

  // Load available plans
  const supabase = createServiceRoleClient();
  const { data: planRows } = await supabase
    .from("subscription_plans")
    .select("id, name, description, code, price_amount, currency, billing_interval, is_active")
    .eq("is_active", true)
    .order("price_amount", { ascending: true });

  // Also load linked Polar product IDs from billing_plans
  const { data: billingPlanRows } = await supabase
    .from("billing_plans" as never)
    .select("plan_key, polar_product_id, is_free" as never)
    .eq("is_active" as never, true);

  const billingPlanMap = new Map(
    ((billingPlanRows ?? []) as unknown as Array<{ plan_key: string; polar_product_id: string | null; is_free: boolean }>)
      .map(bp => [bp.plan_key, bp])
  );

  const plans: PlanOption[] = ((planRows ?? []) as unknown as Array<{
    id: string; name: string; description: string | null; code: string;
    price_amount: number; currency: string; billing_interval: string | null;
  }>).map(p => {
    const billingPlan = billingPlanMap.get(p.code);
    const isFree = p.price_amount === 0 || billingPlan?.is_free === true;
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      code: p.code,
      priceAmount: p.price_amount,
      currency: p.currency,
      billingInterval: p.billing_interval,
      isFree,
      trialDays: isFree ? 0 : 14, // Default 14-day trial for paid plans
      polarProductId: billingPlan?.polar_product_id ?? null,
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
