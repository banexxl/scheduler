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
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import {
     getPlatformSubscriptionStatusCounts,
     listPlatformSubscriptions,
} from "@/features/platform/services/platform-billing-admin-queries";
import { reconcileSubscriptionAdminAction } from "@/features/platform/actions/subscription-admin-actions";

function getFriendlyState(row: Record<string, unknown>) {
     const accessState = String(row.accessState ?? "");
     const status = String(row.status ?? "");

     if (accessState === "active") return "Active";
     if (accessState === "trial") return "Trial";
     if (accessState === "grace_period") return "Payment issue";
     if (accessState === "ending") return "Cancels at period end";
     if (accessState === "revoked") return "Ended";
     if (status === "incomplete") return "Awaiting confirmation";
     return "Pending";
}

async function reconcileAllAction() {
     "use server";
     await reconcileSubscriptionAdminAction({ limit: 100 });
}

async function reconcileSingleAction(formData: FormData) {
     "use server";
     await reconcileSubscriptionAdminAction({
          subscriptionId: String(formData.get("subscriptionId") ?? ""),
     });
}

export default async function PlatformBillingSubscriptionsPage({
     searchParams,
}: {
     searchParams: Promise<{
          polarStatus?: string;
          accessState?: string;
          mappingIssueOnly?: string;
          staleOnly?: string;
     }>;
}) {
     await requirePlatformAdmin();
     const filters = await searchParams;

     const [subscriptions, counts] = await Promise.all([
          listPlatformSubscriptions({
               polarStatus: filters.polarStatus,
               accessState: filters.accessState,
               mappingIssueOnly: filters.mappingIssueOnly === "1",
               staleOnly: filters.staleOnly === "1",
               limit: 150,
          }),
          getPlatformSubscriptionStatusCounts(),
     ]);

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Billing Subscriptions
                    </Typography>
                    <Typography color="text.secondary">
                         Inspect synchronized tenant subscription projections and reconciliation status.
                    </Typography>
               </Box>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1.5} direction={{ xs: "column", md: "row" }}>
                         <Button component="a" href="/platform/billing/subscriptions?accessState=trial" variant="outlined">
                              Trial
                         </Button>
                         <Button component="a" href="/platform/billing/subscriptions?accessState=active" variant="outlined">
                              Active
                         </Button>
                         <Button component="a" href="/platform/billing/subscriptions?polarStatus=past_due" variant="outlined">
                              Past due
                         </Button>
                         <Button component="a" href="/platform/billing/subscriptions?mappingIssueOnly=1" variant="outlined">
                              Mapping issues
                         </Button>
                         <Button component="a" href="/platform/billing/subscriptions?staleOnly=1" variant="outlined">
                              Stale sync
                         </Button>
                         <Button component="a" href="/platform/billing/subscriptions" variant="text">
                              Clear
                         </Button>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
                         <Typography variant="body2">Trial: {counts.trial}</Typography>
                         <Typography variant="body2">Active: {counts.active}</Typography>
                         <Typography variant="body2">Past due: {counts.pastDue}</Typography>
                         <Typography variant="body2">Ending: {counts.ending}</Typography>
                         <Typography variant="body2">Revoked: {counts.revoked}</Typography>
                         <Typography variant="body2">Requires mapping: {counts.requiresMapping}</Typography>
                         <Typography variant="body2">Stale sync: {counts.stale}</Typography>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                         <Typography variant="h6">Subscription List</Typography>
                         <form action={reconcileAllAction}>
                              <Button type="submit" variant="outlined" size="small">
                                   Reconcile active subscriptions
                              </Button>
                         </form>
                    </Stack>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Tenant</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Polar IDs</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Access State</TableCell>
                                        <TableCell>Period End</TableCell>
                                        <TableCell>Sync</TableCell>
                                        <TableCell>Actions</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {subscriptions.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={8}>No subscription rows found.</TableCell>
                                        </TableRow>
                                   ) : (
                                        subscriptions.map((row) => (
                                             <TableRow key={row.id}>
                                                  <TableCell>
                                                       {row.tenantName ?? "-"}
                                                       <br />
                                                       {row.tenantSlug ?? "-"}
                                                  </TableCell>
                                                  <TableCell>{row.planName ?? "Unmapped"}</TableCell>
                                                  <TableCell>
                                                       <Typography variant="caption" component="div">
                                                            Sub: {row.polarSubscriptionId}
                                                       </Typography>
                                                       <Typography variant="caption" component="div">
                                                            Customer: {row.polarCustomerId}
                                                       </Typography>
                                                  </TableCell>
                                                  <TableCell>{row.status}</TableCell>
                                                  <TableCell>{getFriendlyState(row as unknown as Record<string, unknown>)}</TableCell>
                                                  <TableCell>{row.currentPeriodEnd ?? "-"}</TableCell>
                                                  <TableCell>{row.syncStatus}</TableCell>
                                                  <TableCell>
                                                       <Stack direction="row" spacing={1}>
                                                            <Button
                                                                 component="a"
                                                                 href={`/platform/billing/subscriptions/${row.id}`}
                                                                 size="small"
                                                                 variant="outlined"
                                                            >
                                                                 View
                                                            </Button>
                                                            <form action={reconcileSingleAction}>
                                                                 <input type="hidden" name="subscriptionId" value={row.polarSubscriptionId} />
                                                                 <Button type="submit" size="small" variant="outlined">
                                                                      Reconcile
                                                                 </Button>
                                                            </form>
                                                       </Stack>
                                                  </TableCell>
                                             </TableRow>
                                        ))
                                   )}
                              </TableBody>
                         </Table>
                    </TableContainer>
               </Paper>
          </Stack>
     );
}
