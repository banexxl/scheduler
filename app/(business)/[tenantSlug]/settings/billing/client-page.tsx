"use client";

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
import type { BillingOverviewPageData } from "./page";
import { openPortalAction } from "@/features/billing/actions/tenant-billing-page-actions";

export function BillingOverviewClientPage({
     tenantSlug,
     initialData,
}: {
     tenantSlug: string;
     initialData: BillingOverviewPageData;
}) {
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
                              Current state: <strong>{initialData.billingStateLabel}</strong>
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Current plan: <strong>{initialData.currentPlanName}</strong>
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Billing cadence: <strong>{initialData.currentPlanSummary}</strong>
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Sync status: <strong>{initialData.subscriptionSyncStatus}</strong>
                         </Typography>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                         <Typography variant="h6">Billing Setup</Typography>
                         <Typography variant="body2" color="text.secondary">
                              Billing customer mapping: {initialData.hasBillingCustomer ? "Available" : "Not created yet"}
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Customer portal: {initialData.hasBillingCustomer ? "Available" : "Unavailable until customer exists"}
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
                                   {initialData.checkoutSessions.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={5}>No checkout attempts yet.</TableCell>
                                        </TableRow>
                                   ) : (
                                        initialData.checkoutSessions.map((session) => (
                                             <TableRow key={String(session.id)}>
                                                  <TableCell>{String(session.status ?? "-")}</TableCell>
                                                  <TableCell>{String(session.billingPlanId ?? "-")}</TableCell>
                                                  <TableCell>{String(session.billingPlanPriceId ?? "-")}</TableCell>
                                                  <TableCell>{String(session.requestKey ?? "-")}</TableCell>
                                                  <TableCell>{String(session.createdAt ?? "-")}</TableCell>
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
