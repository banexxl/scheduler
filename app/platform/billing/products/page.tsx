import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import {
     getPlatformBillingDashboardMetrics,
     discoverPolarProductsForMapping,
     listBillingWebhookDiagnostics,
     listRecentBillingSyncRuns,
} from "@/features/platform/services/platform-billing-admin-queries";
import { listBillingPlansWithPrices } from "@/features/platform/services/billing-catalog-queries";
import { mapPolarProductToPlanAction } from "@/features/platform/actions/map-polar-product-to-plan";
import {
     refreshAllMappedProductsAction,
     refreshSinglePolarProductAction,
} from "@/features/platform/actions/billing-plan-admin-actions";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { getBillingDiagnosticsConfig } from "@/features/platform/services/polar-config";
import { formatMinorCurrency } from "@/lib/helpers/format-minor-currency";

async function mapAction(formData: FormData) {
     "use server";

     const planId = String(formData.get("planId") ?? "");
     const polarProductIdRaw = String(formData.get("polarProductId") ?? "").trim();
     const polarProductId = polarProductIdRaw.length > 0 ? polarProductIdRaw : null;

     await mapPolarProductToPlanAction(planId, polarProductId);
}

async function refreshAllAction() {
     "use server";
     await refreshAllMappedProductsAction();
}

async function refreshSingleAction(formData: FormData) {
     "use server";
     await refreshSinglePolarProductAction(String(formData.get("polarProductId") ?? ""));
}

export default async function PlatformBillingProductsPage() {
     await requirePlatformAdmin();

     const [plans, recentEvents, recentRuns, discovered, metrics] = await Promise.all([
          listBillingPlansWithPrices(),
          listBillingWebhookDiagnostics(20),
          listRecentBillingSyncRuns(10),
          discoverPolarProductsForMapping(),
          getPlatformBillingDashboardMetrics(),
     ]);

     const diagnostics = getBillingDiagnosticsConfig();

     return (
          <Stack spacing={3}>
               <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
               >
                    <Box>
                         <Typography variant="h4" component="h1" gutterBottom>
                              Billing Product Catalog
                         </Typography>
                         <Typography variant="body1" color="text.secondary">
                              Sync Polar products and map them to local plan keys.
                         </Typography>
                    </Box>
                    <form action={refreshAllAction}>
                         <Button type="submit" variant="contained">
                              Refresh All Mapped Products
                         </Button>
                    </form>
               </Stack>

               <Alert severity={diagnostics.hasAccessToken ? "success" : "warning"}>
                    Polar API: {diagnostics.apiBaseUrl} | Access token: {diagnostics.hasAccessToken ? "configured" : "missing"} | Webhook secret: {diagnostics.hasWebhookSecret ? "configured" : "missing"}
               </Alert>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={1}>
                         <Typography variant="h6">Discovery Snapshot</Typography>
                         <Typography variant="body2" color="text.secondary">
                              Discovered products: {discovered.products.length} | mapped: {discovered.mappedCount} | unmapped: {discovered.unmappedCount}
                         </Typography>
                         <Typography variant="body2" color="text.secondary">
                              Pending webhook events: {metrics.pendingWebhookEvents} | failed webhook events: {metrics.failedWebhookEvents}
                         </Typography>
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                         Plans and Price Mapping
                    </Typography>
                    <Stack spacing={3}>
                         {plans.map((plan) => (
                              <Paper key={plan.id} variant="outlined" sx={{ p: 2 }}>
                                   <Stack spacing={2}>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                             <Typography variant="h6">{plan.name}</Typography>
                                             <Chip label={plan.plan_key} size="small" />
                                             {plan.is_free ? <Chip label="free" size="small" color="info" /> : null}
                                             {plan.is_active ? (
                                                  <Chip label="active" size="small" color="success" />
                                             ) : (
                                                  <Chip label="inactive" size="small" color="default" />
                                             )}
                                        </Stack>

                                        <Typography variant="body2" color="text.secondary">
                                             Polar Product ID: {plan.polar_product_id ?? "Not mapped"}
                                        </Typography>

                                        <form action={mapAction}>
                                             <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                                                  <input type="hidden" name="planId" value={plan.id} />
                                                  <TextField
                                                       size="small"
                                                       name="polarProductId"
                                                       defaultValue={plan.polar_product_id ?? ""}
                                                       label="Polar product ID"
                                                       fullWidth
                                                  />
                                                  <Button type="submit" variant="outlined">
                                                       Save Mapping
                                                  </Button>
                                             </Stack>
                                        </form>

                                        {plan.polar_product_id ? (
                                             <form action={refreshSingleAction}>
                                                  <input type="hidden" name="polarProductId" value={plan.polar_product_id} />
                                                  <Button type="submit" variant="text" size="small">
                                                       Refresh This Product
                                                  </Button>
                                             </form>
                                        ) : null}

                                        <Divider />

                                        <TableContainer>
                                             <Table size="small">
                                                  <TableHead>
                                                       <TableRow>
                                                            <TableCell>Polar Price ID</TableCell>
                                                            <TableCell>Interval</TableCell>
                                                            <TableCell>Amount</TableCell>
                                                            <TableCell>Checkout</TableCell>
                                                            <TableCell>Status</TableCell>
                                                       </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                       {plan.prices.length === 0 ? (
                                                            <TableRow>
                                                                 <TableCell colSpan={5}>No prices synced yet.</TableCell>
                                                            </TableRow>
                                                       ) : (
                                                            plan.prices.map((price) => (
                                                                 <TableRow key={price.id}>
                                                                      <TableCell>{price.polar_price_id}</TableCell>
                                                                      <TableCell>
                                                                           {price.billing_interval ?? "-"}
                                                                           {price.billing_interval_count
                                                                                ? ` x${price.billing_interval_count}`
                                                                                : ""}
                                                                      </TableCell>
                                                                      <TableCell>
                                                                           {formatMinorCurrency(price.amount, price.currency)}
                                                                      </TableCell>
                                                                      <TableCell>
                                                                           {price.is_checkout_eligible ? "eligible" : "not eligible"}
                                                                      </TableCell>
                                                                      <TableCell>
                                                                           {price.is_active && !price.is_archived
                                                                                ? "active"
                                                                                : "archived"}
                                                                      </TableCell>
                                                                 </TableRow>
                                                            ))
                                                       )}
                                                  </TableBody>
                                             </Table>
                                        </TableContainer>
                                   </Stack>
                              </Paper>
                         ))}
                    </Stack>
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                         Unmapped Polar Products
                    </Typography>
                    <Stack spacing={2}>
                         {discovered.products.filter((row) => !row.isMapped).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                   No unmapped products found.
                              </Typography>
                         ) : (
                              discovered.products
                                   .filter((row) => !row.isMapped)
                                   .map((product) => (
                                        <Paper key={product.id} variant="outlined" sx={{ p: 2 }}>
                                             <Stack spacing={1}>
                                                  <Stack direction="row" spacing={1} alignItems="center">
                                                       <Typography fontWeight={600}>{product.name}</Typography>
                                                       <Chip label={product.id} size="small" />
                                                  </Stack>
                                                  <Typography variant="body2" color="text.secondary">
                                                       {product.description ?? "No description"}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                       {product.prices.length} discovered prices
                                                  </Typography>
                                             </Stack>
                                        </Paper>
                                   ))
                         )}
                    </Stack>
               </Paper>

               <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                         <Typography variant="h6" gutterBottom>
                              Recent Webhook Events
                         </Typography>
                         <TableContainer>
                              <Table size="small">
                                   <TableHead>
                                        <TableRow>
                                             <TableCell>Type</TableCell>
                                             <TableCell>Status</TableCell>
                                             <TableCell>Attempts</TableCell>
                                             <TableCell>Created</TableCell>
                                        </TableRow>
                                   </TableHead>
                                   <TableBody>
                                        {recentEvents.length === 0 ? (
                                             <TableRow>
                                                  <TableCell colSpan={4}>No webhook events recorded.</TableCell>
                                             </TableRow>
                                        ) : (
                                             recentEvents.map((event) => (
                                                  <TableRow key={String(event.id)}>
                                                       <TableCell>{String(event.event_type ?? "unknown")}</TableCell>
                                                       <TableCell>{String(event.status ?? "unknown")}</TableCell>
                                                       <TableCell>{String(event.attempt_count ?? "0")}</TableCell>
                                                       <TableCell>{String(event.created_at ?? "-")}</TableCell>
                                                  </TableRow>
                                             ))
                                        )}
                                   </TableBody>
                              </Table>
                         </TableContainer>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                         <Typography variant="h6" gutterBottom>
                              Recent Sync Runs
                         </Typography>
                         <TableContainer>
                              <Table size="small">
                                   <TableHead>
                                        <TableRow>
                                             <TableCell>Type</TableCell>
                                             <TableCell>Status</TableCell>
                                             <TableCell>Source</TableCell>
                                             <TableCell>Started</TableCell>
                                        </TableRow>
                                   </TableHead>
                                   <TableBody>
                                        {recentRuns.length === 0 ? (
                                             <TableRow>
                                                  <TableCell colSpan={4}>No sync runs recorded.</TableCell>
                                             </TableRow>
                                        ) : (
                                             recentRuns.map((run) => (
                                                  <TableRow key={String(run.id)}>
                                                       <TableCell>{String(run.run_type ?? "-")}</TableCell>
                                                       <TableCell>{String(run.status ?? "-")}</TableCell>
                                                       <TableCell>{String(run.sync_source ?? "-")}</TableCell>
                                                       <TableCell>{String(run.started_at ?? "-")}</TableCell>
                                                  </TableRow>
                                             ))
                                        )}
                                   </TableBody>
                              </Table>
                         </TableContainer>
                    </Paper>
               </Stack>

               <Typography variant="body2" color="text.secondary">
                    Existing placeholder subscriptions page remains available at{" "}
                    <Link href="/platform/subscriptions">/platform/subscriptions</Link>.
               </Typography>
          </Stack>
     );
}
