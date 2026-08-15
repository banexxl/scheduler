import { randomUUID } from "node:crypto";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { listCheckoutEligiblePlansForTenant } from "@/features/platform/services/tenant-billing-queries";
import { BillingPlansClientPage } from "./client-page";

export type BillingPlansPageData = {
     plans: Array<{
          id: string;
          name: string;
          description: string | null;
          prices: Array<{
               id: string;
               amount: number | null;
               currency: string | null;
               billingInterval: string | null;
               billingIntervalCount: number | null;
               priceType: string | null;
               requestKey: string;
          }>;
     }>;
};

export default async function TenantBillingPlansPage({
     params,
}: {
     params: Promise<{ tenantSlug: string }>;
}) {
     const { tenantSlug } = await params;
     await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const plans = (await listCheckoutEligiblePlansForTenant()) as Array<
          Record<string, unknown> & { prices: Array<Record<string, unknown>> }
     >;

     const initialData: BillingPlansPageData = {
          plans: plans.map((plan) => ({
               id: String(plan.id),
               name: String(plan.name ?? "Plan"),
               description: typeof plan.description === "string" ? plan.description : null,
               prices: (plan.prices as Array<Record<string, unknown>>).map((price) => ({
                    id: String(price.id),
                    amount: typeof price.amount === "number" ? price.amount : null,
                    currency: typeof price.currency === "string" ? price.currency : null,
                    billingInterval: typeof price.billing_interval === "string" ? price.billing_interval : null,
                    billingIntervalCount: typeof price.billing_interval_count === "number" ? price.billing_interval_count : null,
                    priceType: typeof price.price_type === "string" ? price.price_type : null,
                    requestKey: randomUUID(),
               })),
          })),
     };

     return <BillingPlansClientPage tenantSlug={tenantSlug} initialData={initialData} />;
}
