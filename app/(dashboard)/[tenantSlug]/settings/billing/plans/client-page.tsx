"use client";

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
import { formatMinorCurrency } from "@/lib/helpers/format-minor-currency";
import { startCheckoutAction } from "@/features/billing/actions/tenant-billing-page-actions";
import type { BillingPlansPageData } from "./page";

export function BillingPlansClientPage({
     tenantSlug,
     initialData,
}: {
     tenantSlug: string;
     initialData: BillingPlansPageData;
}) {
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
                         {initialData.plans.length === 0 ? (
                              <Typography>No checkout-eligible plans are available yet.</Typography>
                         ) : (
                              initialData.plans.map((plan) => (
                                   <Paper key={plan.id} variant="outlined" sx={{ p: 2 }}>
                                        <Stack spacing={1}>
                                             <Typography variant="h6">{plan.name}</Typography>
                                             <Typography variant="body2" color="text.secondary">
                                                  {plan.description}
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
                                                            {plan.prices.map((price) => (
                                                                 <TableRow key={price.id}>
                                                                      <TableCell>{formatMinorCurrency(price.amount, price.currency)}</TableCell>
                                                                      <TableCell>
                                                                           {price.billingInterval}
                                                                           {price.billingIntervalCount ? ` x${price.billingIntervalCount}` : ""}
                                                                      </TableCell>
                                                                      <TableCell>{price.priceType}</TableCell>
                                                                      <TableCell>
                                                                           <form action={startCheckoutAction}>
                                                                                <input type="hidden" name="tenantSlug" value={tenantSlug} />
                                                                                <input type="hidden" name="billingPlanPriceId" value={price.id} />
                                                                                <input type="hidden" name="requestKey" value={price.requestKey} />
                                                                                <Button type="submit" size="small" variant="contained">
                                                                                     Continue
                                                                                </Button>
                                                                           </form>
                                                                      </TableCell>
                                                                 </TableRow>
                                                            ))}
                                                       </TableBody>
                                                  </Table>
                                             </TableContainer>
                                        </Stack>
                                   </Paper>
                              ))
                         )}
                    </Stack>
               </Paper>

               <Button href={`/${tenantSlug}/settings/billing`} variant="text" sx={{ width: "fit-content" }}>
                    Back to Billing
               </Button>
          </Stack>
     );
}
