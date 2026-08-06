import Link from "next/link";
import { randomUUID } from "node:crypto";
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
import { formatMinorCurrency } from "@/lib/helpers/format-minor-currency";
import { listCheckoutEligiblePlansForTenant } from "@/features/platform/services/tenant-billing-queries";
import { createPolarCheckoutAction } from "@/features/platform/actions/tenant-billing-actions";

async function startCheckoutAction(formData: FormData) {
     "use server";

     const tenantSlug = String(formData.get("tenantSlug") ?? "");
     const billingPlanPriceId = String(formData.get("billingPlanPriceId") ?? "");
     const requestKey = String(formData.get("requestKey") ?? "");

     const result = await createPolarCheckoutAction(tenantSlug, {
          billingPlanPriceId,
          requestKey,
     });

     if (result.success && result.data?.checkoutUrl) {
          redirect(result.data.checkoutUrl);
     }
}

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

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Billing Plans
                    </Typography>
                    <Typography color="text.secondary">
                         Choose a hosted Polar checkout option. Subscription activation is confirmed later by webhook synchronization.
                    </Typography>
               </Box>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                         {plans.length === 0 ? (
                              <Typography>No checkout-eligible plans are available yet.</Typography>
                         ) : (
                              plans.map((plan) => (
                                   <Paper key={String(plan.id)} variant="outlined" sx={{ p: 2 }}>
                                        <Stack spacing={1}>
                                             <Typography variant="h6">{String(plan.name)}</Typography>
                                             <Typography variant="body2" color="text.secondary">
                                                  {String(plan.description ?? "")}
                                             </Typography>

                                             <TableContainer>
                                                  <Table size="small">
                                                       <TableHead>
                                                            <TableRow>
                                                                 <TableCell>Amount</TableCell>
                                                                 <TableCell>Interval</TableCell>
                                                                 <TableCell>Type</TableCell>
                                                                 <TableCell>Start Checkout</TableCell>
                                                            </TableRow>
                                                       </TableHead>
                                                       <TableBody>
                                                            {(plan.prices as Array<Record<string, unknown>>).map((price) => {
                                                                 const requestKey = randomUUID();
                                                                 return (
                                                                      <TableRow key={String(price.id)}>
                                                                           <TableCell>
                                                                                {formatMinorCurrency(
                                                                                     typeof price.amount === "number" ? price.amount : null,
                                                                                     typeof price.currency === "string" ? price.currency : null
                                                                                )}
                                                                           </TableCell>
                                                                           <TableCell>
                                                                                {String(price.billing_interval ?? "-")}
                                                                                {typeof price.billing_interval_count === "number"
                                                                                     ? ` x${price.billing_interval_count}`
                                                                                     : ""}
                                                                           </TableCell>
                                                                           <TableCell>{String(price.price_type ?? "-")}</TableCell>
                                                                           <TableCell>
                                                                                <form action={startCheckoutAction}>
                                                                                     <input type="hidden" name="tenantSlug" value={tenantSlug} />
                                                                                     <input type="hidden" name="billingPlanPriceId" value={String(price.id)} />
                                                                                     <input type="hidden" name="requestKey" value={requestKey} />
                                                                                     <Button type="submit" size="small" variant="contained">
                                                                                          Continue
                                                                                     </Button>
                                                                                </form>
                                                                           </TableCell>
                                                                      </TableRow>
                                                                 );
                                                            })}
                                                       </TableBody>
                                                  </Table>
                                             </TableContainer>
                                        </Stack>
                                   </Paper>
                              ))
                         )}
                    </Stack>
               </Paper>

               <Button component={Link} href={`/${tenantSlug}/settings/billing`} variant="text" sx={{ width: "fit-content" }}>
                    Back to Billing
               </Button>
          </Stack>
     );
}
