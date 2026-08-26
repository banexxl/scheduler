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
import { getPlatformSubscriptionDetail } from "@/features/platform/services/platform-billing-admin-queries";
import { reconcileSubscriptionAdminAction } from "@/features/platform/actions/subscription-admin-actions";
import ServerActionForm from "@/features/platform/components/server-action-form";

async function reconcileAction(formData: FormData) {
     "use server";
     await reconcileSubscriptionAdminAction({
          subscriptionId: String(formData.get("polarSubscriptionId") ?? ""),
     });
}

export default async function PlatformBillingSubscriptionDetailPage({
     params,
}: {
     params: Promise<{ subscriptionId: string }>;
}) {
     await requirePlatformAdmin();
     const { subscriptionId } = await params;

     const detail = await getPlatformSubscriptionDetail(subscriptionId);
     const subscription = detail.subscription;

     if (!subscription) {
          return (
               <Stack spacing={2}>
                    <Typography variant="h5">Subscription not found.</Typography>
                    <Button component="a" href="/platform/billing/subscriptions" variant="outlined">
                         Back to Subscriptions
                    </Button>
               </Stack>
          );
     }

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Subscription Detail
                    </Typography>
                    <Typography color="text.secondary">
                         Inspect tenant correlation, normalized state, and synchronization diagnostics.
                    </Typography>
               </Box>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                         <Typography variant="h6">Core</Typography>
                         <Typography>Tenant ID: {String(subscription.tenant_id ?? "-")}</Typography>
                         <Typography>Polar subscription: {String(subscription.polar_subscription_id ?? "-")}</Typography>
                         <Typography>Polar customer: {String(subscription.polar_customer_id ?? "-")}</Typography>
                         <Typography>Status: {String(subscription.status ?? "-")}</Typography>
                         <Typography>Access state: {String(subscription.access_state ?? "-")}</Typography>
                         <Typography>Sync status: {String(subscription.status ?? "-")}</Typography>
                         <Typography>Last synced: {String(subscription.last_synced_at ?? "-")}</Typography>
                         <Typography>Current period: {String(subscription.current_period_start ?? "-")} - {String(subscription.current_period_ends_at ?? "-")}</Typography>
                         <Typography>Trial: {String(subscription.trial_start ?? "-")} - {String(subscription.trial_ends_at ?? "-")}</Typography>
                         <Typography>Cancel at period end: {String(subscription.cancel_at_period_end ?? false)}</Typography>
                         <Typography>Ends at: {String(subscription.ends_at ?? "-")}</Typography>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                         State History
                    </Typography>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Effective At</TableCell>
                                        <TableCell>Previous</TableCell>
                                        <TableCell>New</TableCell>
                                        <TableCell>Source</TableCell>
                                        <TableCell>Polar Event ID</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {detail.history.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={5}>No history entries found.</TableCell>
                                        </TableRow>
                                   ) : (
                                        detail.history.map((row) => (
                                             <TableRow key={String(row.id)}>
                                                  <TableCell>{String(row.effective_at ?? "-")}</TableCell>
                                                  <TableCell>
                                                       {String(row.previous_status ?? "-")} / {String(row.previous_access_state ?? "-")}
                                                  </TableCell>
                                                  <TableCell>
                                                       {String(row.new_status ?? "-")} / {String(row.new_access_state ?? "-")}
                                                  </TableCell>
                                                  <TableCell>{String(row.change_source ?? "-")}</TableCell>
                                                  <TableCell>{String(row.polar_event_id ?? "-")}</TableCell>
                                             </TableRow>
                                        ))
                                   )}
                              </TableBody>
                         </Table>
                    </TableContainer>
               </Paper>

               <Stack direction="row" spacing={1}>
                    <Button component="a" href="/platform/billing/subscriptions" variant="outlined">
                         Back
                    </Button>
                    <ServerActionForm action={reconcileAction} successMessage="Subscription reconciled.">
                         <input
                              type="hidden"
                              name="polarSubscriptionId"
                              value={String(subscription.polar_subscription_id ?? "")}
                         />
                         <Button type="submit" variant="contained">
                              Reconcile Now
                         </Button>
                    </ServerActionForm>
               </Stack>
          </Stack>
     );
}
