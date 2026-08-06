import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import {
     createPolarCustomerPortalSessionAction,
} from "@/features/platform/actions/tenant-billing-actions";
import { getTenantBillingOverview } from "@/features/platform/services/tenant-billing-queries";
import { resolveBillingState, type BillingState } from "@/features/billing/services/tenant-entitlements";

async function openPortalAction(formData: FormData) {
     "use server";

     const tenantSlug = String(formData.get("tenantSlug") ?? "");
     const result = await createPolarCustomerPortalSessionAction(tenantSlug, {
          intent: "open",
     });

     if (result.success && result.data?.portalUrl) {
          redirect(result.data.portalUrl);
     }
}

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

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Billing
                    </Typography>
                    <Typography color="text.secondary">
                         Subscription synchronization is in progress. Checkout completion does not activate a plan yet.
                    </Typography>
               </Box>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                         <Typography variant="h6">Subscription Overview</Typography>
                         <Typography variant="body2" color="text.secondary">
                              Current state: <strong>{formatBillingStateLabel(billingState)}</strong>
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Current plan: <strong>{currentPlanName}</strong>
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Billing cadence: <strong>{currentPlanKey === "free" ? "Free" : `${currentAmount} ${currentCurrency}`}</strong>
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Sync status: <strong>{subscription ? String(subscription.sync_status ?? "synced") : "No subscription"}</strong>
                         </Typography>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                         <Typography variant="h6">Billing Setup</Typography>
                         <Typography variant="body2" color="text.secondary">
                              Billing customer mapping: {overview.hasBillingCustomer ? "Available" : "Not created yet"}
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Customer portal: {overview.hasBillingCustomer ? "Available" : "Unavailable until customer exists"}
                         </Typography>

                         <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                              <Button component={Link} href={`/${tenantSlug}/settings/billing/plans`} variant="contained">
                                   View Plans
                              </Button>
                              <Button component={Link} href={`/${tenantSlug}/settings/billing/history`} variant="outlined">
                                   View Billing History
                              </Button>
                              <form action={openPortalAction}>
                                   <input type="hidden" name="tenantSlug" value={tenantSlug} />
                                   <Button type="submit" variant="outlined">
                                        Open Customer Portal
                                   </Button>
                              </form>
                         </Stack>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                         Recent Checkout Attempts
                    </Typography>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Price</TableCell>
                                        <TableCell>Request Key</TableCell>
                                        <TableCell>Created</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {overview.checkoutSessions.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={5}>No checkout attempts yet.</TableCell>
                                        </TableRow>
                                   ) : (
                                        overview.checkoutSessions.map((session) => (
                                             <TableRow key={String(session.id)}>
                                                  <TableCell>{String(session.status ?? "-")}</TableCell>
                                                  <TableCell>{String(session.billing_plan_id ?? "-")}</TableCell>
                                                  <TableCell>{String(session.billing_plan_price_id ?? "-")}</TableCell>
                                                  <TableCell>{String(session.request_key ?? "-")}</TableCell>
                                                  <TableCell>{String(session.created_at ?? "-")}</TableCell>
                                             </TableRow>
                                        ))
                                   )}
                              </TableBody>
                         </Table>
                    </TableContainer>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                         Billing Snapshot
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                         Orders and refunds are now synchronized into local projections for tenant billing history and future diagnostics.
                    </Typography>
               </Paper>
          </Stack>
     );
}
