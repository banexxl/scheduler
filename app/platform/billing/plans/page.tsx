import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
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
import CreatePlanForm from "@/features/platform/components/create-plan-form";
import PlanActionButtons from "@/features/platform/components/plan-action-buttons";
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

async function updatePlanFormAction(formData: FormData) {
     "use server";

     await updateBillingPlanAction({
          id: String(formData.get("id") ?? ""),
          name: String(formData.get("name") ?? ""),
          description: String(formData.get("description") ?? "") || null,
          isFree: String(formData.get("isFree") ?? "") === "on",
          isActive: String(formData.get("isActive") ?? "") === "on",
          isPublic: String(formData.get("isPublic") ?? "") === "on",
          sortOrder: Number(formData.get("sortOrder") ?? "0"),
     });
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
                    <Typography variant="h6" gutterBottom>
                         Create Plan
                    </Typography>
                    <CreatePlanForm action={createPlanFormAction} />
               </Paper>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                         <Typography variant="h6">Plan List</Typography>
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

                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>State</TableCell>
                                        <TableCell>Price</TableCell>
                                        <TableCell>Interval</TableCell>
                                        <TableCell>Trial</TableCell>
                                        <TableCell>Mapping</TableCell>
                                        <TableCell>Sort</TableCell>
                                        <TableCell>Actions</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {plans.map((plan) => (
                                        <TableRow key={plan.id}>
                                             <TableCell>
                                                  <Stack spacing={0.5}>
                                                       <Typography fontWeight={600}>{plan.name}</Typography>
                                                       <Typography variant="caption" color="text.secondary">
                                                            {plan.planKey}
                                                       </Typography>
                                                  </Stack>
                                             </TableCell>
                                             <TableCell>
                                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                       {plan.isFree ? <Chip size="small" label="free" /> : null}
                                                       {plan.isActive ? <Chip size="small" label="active" color="success" /> : <Chip size="small" label="inactive" />}
                                                       {plan.isPublic ? <Chip size="small" label="public" color="info" /> : <Chip size="small" label="hidden" />}
                                                  </Stack>
                                             </TableCell>
                                             <TableCell>
                                                  {plan.isFree ? (
                                                       <Typography variant="body2" color="text.secondary">Free</Typography>
                                                  ) : plan.prices.length > 0 ? (
                                                       <Stack spacing={0.25}>
                                                            {plan.prices.map((p, idx) => (
                                                                 <Typography key={idx} variant="body2">
                                                                      {p.amount != null
                                                                           ? `${(p.amount / 100).toFixed(2)} ${(p.currency ?? "").toUpperCase()}`
                                                                           : "—"}
                                                                 </Typography>
                                                            ))}
                                                       </Stack>
                                                  ) : (
                                                       <Typography variant="body2" color="text.secondary">No price</Typography>
                                                  )}
                                             </TableCell>
                                             <TableCell>
                                                  {plan.isFree ? (
                                                       <Typography variant="body2" color="text.secondary">—</Typography>
                                                  ) : plan.prices.length > 0 ? (
                                                       <Stack spacing={0.25}>
                                                            {plan.prices.map((p, idx) => (
                                                                 <Typography key={idx} variant="body2">
                                                                      {p.isRecurring
                                                                           ? `${p.billingInterval ?? "month"}${(p.billingIntervalCount ?? 1) > 1 ? ` ×${p.billingIntervalCount}` : ""}`
                                                                           : "one-time"}
                                                                 </Typography>
                                                            ))}
                                                       </Stack>
                                                  ) : (
                                                       <Typography variant="body2" color="text.secondary">—</Typography>
                                                  )}
                                             </TableCell>
                                             <TableCell>
                                                  {plan.trialDays != null && plan.trialDays > 0 ? (
                                                       <Chip size="small" label={`${plan.trialDays}d trial`} variant="outlined" />
                                                  ) : (
                                                       <Typography variant="body2" color="text.secondary">—</Typography>
                                                  )}
                                             </TableCell>
                                             <TableCell>{plan.polarProductId ?? "Not mapped"}</TableCell>
                                             <TableCell>{plan.sortOrder}</TableCell>
                                             <TableCell>
                                                  <PlanActionButtons
                                                       plan={{
                                                            id: plan.id,
                                                            name: plan.name,
                                                            planKey: plan.planKey,
                                                            isActive: plan.isActive,
                                                            isPublic: plan.isPublic,
                                                            polarProductId: plan.polarProductId ?? null,
                                                       }}
                                                       onToggleActive={async (planId, nextState) => { "use server"; await toggleBillingPlanActiveAction(planId, nextState); }}
                                                       onTogglePublic={async (planId, nextState) => { "use server"; await toggleBillingPlanPublicAction(planId, nextState); }}
                                                       onDelete={async (planId) => { "use server"; await deleteBillingPlanAction(planId); }}
                                                       onRefresh={async (polarProductId) => { "use server"; await refreshSinglePolarProductAction(polarProductId); }}
                                                  />
                                             </TableCell>
                                        </TableRow>
                                   ))}
                              </TableBody>
                         </Table>
                    </TableContainer>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                         Quick Edit
                    </Typography>
                    <Stack spacing={2}>
                         {plans.map((plan) => (
                              <ServerActionForm key={`edit-${plan.id}`} action={updatePlanFormAction} successMessage="Plan updated.">
                                   <Paper variant="outlined" sx={{ p: 1.5 }}>
                                        <input type="hidden" name="id" value={plan.id} />
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                                             <TextField size="small" name="name" label="Name" defaultValue={plan.name} required />
                                             <TextField size="small" name="description" label="Description" defaultValue={plan.description ?? ""} />
                                             <TextField size="small" name="sortOrder" label="Sort" defaultValue={String(plan.sortOrder)} />
                                             <label>
                                                  <input type="checkbox" name="isFree" defaultChecked={plan.isFree} /> Free
                                             </label>
                                             <label>
                                                  <input type="checkbox" name="isActive" defaultChecked={plan.isActive} /> Active
                                             </label>
                                             <label>
                                                  <input type="checkbox" name="isPublic" defaultChecked={plan.isPublic} /> Public
                                             </label>
                                             <Button size="small" type="submit" variant="contained">Save</Button>
                                        </Stack>
                                   </Paper>
                              </ServerActionForm>
                         ))}
                    </Stack>
               </Paper>
          </Stack >
     );
}
