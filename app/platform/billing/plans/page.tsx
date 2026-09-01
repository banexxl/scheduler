import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
     createBillingPlanAction,
     deleteBillingPlanAction,
     refreshAllMappedProductsAction,
     refreshSinglePolarProductAction,
     reorderBillingPlansAction,
     toggleBillingPlanActiveAction,
     toggleBillingPlanPublicAction,
     updateBillingPlanAction,
} from "@/features/platform/actions/billing-plan-admin-actions";
import { listPlatformBillingPlanSummaries } from "@/features/platform/services/platform-billing-admin-queries";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import PolarConfigAlert from "@/features/platform/components/polar-config-alert";
import PlanManager from "@/features/platform/components/plan-manager";
import ServerActionForm from "@/features/platform/components/server-action-form";

async function createPlanFormAction(formData: FormData): Promise<string | null> {
     "use server";

     const isFree = String(formData.get("isFree") ?? "") === "on";

     const result = await createBillingPlanAction({
          planKey: String(formData.get("planKey") ?? ""),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? "") || null,
          isFree,
          isActive: true,
          isPublic: true,
          sortOrder: Number(formData.get("sortOrder") ?? "0"),
          // Pricing (only for paid plans)
          ...(!isFree && {
               priceAmount: Number(formData.get("priceAmount") ?? "0"),
               priceCurrency: String(formData.get("priceCurrency") ?? "usd").toLowerCase(),
               isRecurring: String(formData.get("billingType") ?? "recurring") === "recurring",
               recurringInterval: (String(formData.get("recurringInterval") ?? "month") as "month" | "year"),
               recurringIntervalCount: Number(formData.get("recurringIntervalCount") ?? "1"),
               trialDays: Number(formData.get("trialDays") ?? "0") || undefined,
          }),
     });

     if (!result.success) {
          return result.message;
     }

     return null;
}

async function updatePlanFormAction(formData: FormData): Promise<string | null> {
     "use server";

     // Pricing fields are only present for paid plans (the client omits them for
     // free plans). When present, the action applies the price change on Polar.
     const hasPricing = formData.has("priceAmount");

     const result = await updateBillingPlanAction({
          id: String(formData.get("id") ?? ""),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? "") || null,
          // `isFree` is not editable in these paid-only forms — the action preserves
          // the stored value regardless of what is sent here.
          isFree: false,
          isActive: String(formData.get("isActive") ?? "") === "on",
          isPublic: String(formData.get("isPublic") ?? "") === "on",
          sortOrder: Number(formData.get("sortOrder") ?? "0"),
          ...(hasPricing && {
               priceAmount: Number(formData.get("priceAmount") ?? "0"),
               priceCurrency: String(formData.get("priceCurrency") ?? "usd").toLowerCase(),
               isRecurring: String(formData.get("billingType") ?? "recurring") === "recurring",
               recurringInterval: (String(formData.get("recurringInterval") ?? "month") as "month" | "year"),
               recurringIntervalCount: Number(formData.get("recurringIntervalCount") ?? "1"),
               trialDays: Number(formData.get("trialDays") ?? "0"),
          }),
     });

     if (!result.success) {
          return result.message;
     }

     return null;
}

async function reorderFormAction(formData: FormData) {
     "use server";

     const ids = String(formData.get("orderedIds") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

     await reorderBillingPlansAction({ orderedPlanIds: ids });
}

async function syncAllProductsAction() {
     "use server";
     await refreshAllMappedProductsAction();
}

export default async function PlatformBillingPlansPage() {
     await requirePlatformAdmin();
     const plans = await listPlatformBillingPlanSummaries();

     const orderedIds = plans.map((plan) => plan.id);

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Billing Plans
                    </Typography>
                    <Typography color="text.secondary">
                         Manage local billing plans. Polar price values stay read-only and are synchronized from Polar.
                    </Typography>
               </Box>

               <PolarConfigAlert />

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                         <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              Bulk actions
                         </Typography>
                         <ServerActionForm action={reorderFormAction} successMessage="Plan order saved.">
                              <input type="hidden" name="orderedIds" value={orderedIds.join(",")} />
                              <Button type="submit" variant="outlined" size="small">
                                   Save Current Order
                              </Button>
                         </ServerActionForm>
                         <ServerActionForm action={syncAllProductsAction} successMessage="All products synced from Polar.">
                              <Button type="submit" variant="outlined" size="small" color="secondary">
                                   Sync All from Polar
                              </Button>
                         </ServerActionForm>
                    </Stack>
               </Paper>

               <PlanManager
                    plans={plans}
                    createAction={createPlanFormAction}
                    updateAction={updatePlanFormAction}
                    onToggleActive={async (planId, nextState) => { "use server"; await toggleBillingPlanActiveAction(planId, nextState); }}
                    onTogglePublic={async (planId, nextState) => { "use server"; await toggleBillingPlanPublicAction(planId, nextState); }}
                    onDelete={async (planId) => { "use server"; await deleteBillingPlanAction(planId); }}
                    onRefresh={async (polarProductId) => { "use server"; await refreshSinglePolarProductAction(polarProductId); }}
               />
          </Stack >
     );
}
