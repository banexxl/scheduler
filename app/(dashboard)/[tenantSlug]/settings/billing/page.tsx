import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { getTenantBillingOverview } from "@/features/platform/services/tenant-billing-queries";
import { resolveBillingState, type BillingState } from "@/features/billing/services/tenant-entitlements";
import { BillingOverviewClientPage } from "./client-page";

export type BillingOverviewPageData = {
     billingStateLabel: string;
     currentPlanName: string;
     currentPlanSummary: string;
     subscriptionSyncStatus: string;
     hasBillingCustomer: boolean;
     checkoutSessions: Array<{
          id: string;
          status: string | null;
          billingPlanId: string | null;
          billingPlanPriceId: string | null;
          requestKey: string | null;
          createdAt: string | null;
     }>;
};

function formatBillingStateLabel(state: BillingState): string {
     switch (state) {
          case "trial":
               return "Trial";
          case "active":
               return "Active";
          case "grace_period":
               return "Grace Period";
          case "restricted":
               return "Restricted";
          default:
               return "Free";
     }
}

export default async function TenantBillingOverviewPage({
     params,
}: {
     params: Promise<{ tenantSlug: string }>;
}) {
     const { tenantSlug } = await params;
     const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const overview = await getTenantBillingOverview(tenant.id);
     const subscription = (overview.currentSubscription as Record<string, unknown> | null) ?? null;
     const billingState = resolveBillingState(subscription ?? {});
     const currentPlanName = typeof subscription?.billing_plans === "object" && subscription.billing_plans
          ? String((subscription.billing_plans as Record<string, unknown>).name ?? "Free")
          : "Free";
     const currentPlanKey = typeof subscription?.billing_plans === "object" && subscription.billing_plans
          ? String((subscription.billing_plans as Record<string, unknown>).plan_key ?? "free")
          : "free";
     const currentAmount = typeof subscription?.billing_plan_prices === "object" && subscription.billing_plan_prices
          ? Number((subscription.billing_plan_prices as Record<string, unknown>).amount ?? 0)
          : 0;
     const currentCurrency = typeof subscription?.billing_plan_prices === "object" && subscription.billing_plan_prices
          ? String((subscription.billing_plan_prices as Record<string, unknown>).currency ?? "USD")
          : "USD";

     const initialData: BillingOverviewPageData = {
          billingStateLabel: formatBillingStateLabel(billingState),
          currentPlanName,
          currentPlanSummary: currentPlanKey === "free" ? "Free" : `${currentAmount} ${currentCurrency}`,
          subscriptionSyncStatus: subscription ? String(subscription.sync_status ?? "synced") : "No subscription",
          hasBillingCustomer: Boolean(overview.hasBillingCustomer),
          checkoutSessions: (overview.checkoutSessions ?? []).map((session) => ({
               id: String(session.id),
               status: session.status ? String(session.status) : null,
               billingPlanId: session.billing_plan_id ? String(session.billing_plan_id) : null,
               billingPlanPriceId: session.billing_plan_price_id ? String(session.billing_plan_price_id) : null,
               requestKey: session.request_key ? String(session.request_key) : null,
               createdAt: session.created_at ? String(session.created_at) : null,
          })),
     };

     return <BillingOverviewClientPage tenantSlug={tenantSlug} initialData={initialData} />;
}
