import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import {
     getPlatformSubscriptionStatusCounts,
     listPlatformSubscriptions,
} from "@/features/platform/services/platform-billing-admin-queries";
import { reconcileSubscriptionAdminAction } from "@/features/platform/actions/subscription-admin-actions";
import PageHeader from "@/features/platform/components/page-header";
import PolarConfigAlert from "@/features/platform/components/polar-config-alert";
import SectionCard from "@/features/platform/components/section-card";
import MetricCard from "@/features/platform/components/metric-card";
import PlatformEmptyState from "@/features/platform/components/platform-empty-state";
import StatusChip from "@/components/ui/status-chip";

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
               <PageHeader
                    title="Subscriptions"
                    description="Synchronized tenant subscription projections and reconciliation."
                    breadcrumbs={[
                         { label: "Platform", href: "/platform" },
                         { label: "Billing", href: "/platform/billing" },
                         { label: "Subscriptions" },
                    ]}
                    action={
                         <form action={reconcileAllAction}>
                              <Button type="submit" variant="outlined" size="small">
                                   Reconcile All
                              </Button>
                         </form>
                    }
               />

               <PolarConfigAlert />

               {/* Status counts */}
               <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                         <MetricCard label="Trial" value={counts.trial} variant="info" />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                         <MetricCard label="Active" value={counts.active} variant="success" />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                         <MetricCard label="Past Due" value={counts.pastDue} variant={counts.pastDue > 0 ? "warning" : "default"} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                         <MetricCard label="Ending" value={counts.ending} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                         <MetricCard label="Revoked" value={counts.revoked} variant={counts.revoked > 0 ? "error" : "default"} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                         <MetricCard label="Needs Mapping" value={counts.requiresMapping} variant={counts.requiresMapping > 0 ? "warning" : "default"} />
                    </Grid>
               </Grid>

               {/* Filters */}
               <SectionCard noPadding>
                    <Box sx={{ p: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                         {[
                              { label: "Trial", href: "?accessState=trial" },
                              { label: "Active", href: "?accessState=active" },
                              { label: "Past Due", href: "?polarStatus=past_due" },
                              { label: "Mapping Issues", href: "?mappingIssueOnly=1" },
                              { label: "Stale Sync", href: "?staleOnly=1" },
                         ].map((filter) => (
                              <Chip
                                   key={filter.label}
                                   label={filter.label}
                                   component="a"
                                   href={`/platform/billing/subscriptions${filter.href}`}
                                   clickable
                                   size="small"
                                   variant="outlined"
                              />
                         ))}
                         {(filters.polarStatus || filters.accessState || filters.mappingIssueOnly || filters.staleOnly) && (
                              <Chip
                                   label="Clear"
                                   component="a"
                                   href="/platform/billing/subscriptions"
                                   clickable
                                   size="small"
                                   variant="outlined"
                                   color="default"
                              />
                         )}
                    </Box>
               </SectionCard>

               <SectionCard title="Subscription List" noPadding>
                    {subscriptions.length === 0 ? (
                         <Box sx={{ p: 3 }}>
                              <PlatformEmptyState title="No subscriptions found" description="Adjust your filters or check back later." />
                         </Box>
                    ) : (
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
                                                       <TableCell>
                                                            <StatusChip label={getFriendlyState(row as unknown as Record<string, unknown>)} size="small" />
                                                       </TableCell>
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
                    )}
               </SectionCard>
          </Stack>
     );
}
