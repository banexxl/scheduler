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

async function createPlanFormAction(formData: FormData) {
     "use server";

     const isFree = String(formData.get("isFree") ?? "") === "on";

     await createBillingPlanAction({
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

async function togglePlanActiveFormAction(formData: FormData) {
     "use server";

     await toggleBillingPlanActiveAction(
          String(formData.get("planId") ?? ""),
          String(formData.get("nextState") ?? "") === "true"
     );
}

async function togglePlanPublicFormAction(formData: FormData) {
     "use server";

     await toggleBillingPlanPublicAction(
          String(formData.get("planId") ?? ""),
          String(formData.get("nextState") ?? "") === "true"
     );
}

async function reorderFormAction(formData: FormData) {
     "use server";

     const ids = String(formData.get("orderedIds") ?? "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

     await reorderBillingPlansAction({ orderedPlanIds: ids });
}

async function refreshPlanProductFormAction(formData: FormData) {
     "use server";

     await refreshSinglePolarProductAction(
          String(formData.get("polarProductId") ?? "")
     );
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
                         <form action={reorderFormAction}>
                              <input type="hidden" name="orderedIds" value={orderedIds.join(",")} />
                              <Button type="submit" variant="outlined" size="small">
                                   Save Current Order
                              </Button>
                         </form>
                    </Stack>

                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>State</TableCell>
                                        <TableCell>Mapping</TableCell>
                                        <TableCell>Prices</TableCell>
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
                                             <TableCell>{plan.polarProductId ?? "Not mapped"}</TableCell>
                                             <TableCell>
                                                  {plan.activePriceCount} active / {plan.archivedPriceCount} archived
                                             </TableCell>
                                             <TableCell>{plan.sortOrder}</TableCell>
                                             <TableCell>
                                                  <Stack spacing={1}>
                                                       <form action={togglePlanActiveFormAction}>
                                                            <input type="hidden" name="planId" value={plan.id} />
                                                            <input type="hidden" name="nextState" value={String(!plan.isActive)} />
                                                            <Button size="small" type="submit" variant="outlined">
                                                                 {plan.isActive ? "Deactivate" : "Activate"}
                                                            </Button>
                                                       </form>
                                                       <form action={togglePlanPublicFormAction}>
                                                            <input type="hidden" name="planId" value={plan.id} />
                                                            <input type="hidden" name="nextState" value={String(!plan.isPublic)} />
                                                            <Button size="small" type="submit" variant="outlined">
                                                                 {plan.isPublic ? "Hide" : "Show"}
                                                            </Button>
                                                       </form>
                                                       <Button
                                                            size="small"
                                                            variant="outlined"
                                                            component="a"
                                                            href={`/platform/billing/products`}
                                                       >
                                                            Open Mapping
                                                       </Button>
                                                       {plan.polarProductId ? (
                                                            <form action={refreshPlanProductFormAction}>
                                                                 <input
                                                                      type="hidden"
                                                                      name="polarProductId"
                                                                      value={plan.polarProductId}
                                                                 />
                                                                 <Button size="small" type="submit" variant="outlined">
                                                                      Refresh Product
                                                                 </Button>
                                                            </form>
                                                       ) : null}
                                                  </Stack>
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
                              <form key={`edit-${plan.id}`} action={updatePlanFormAction}>
                                   <Paper variant="outlined" sx={{ p: 1.5 }}>
                                        <input type="hidden" name="id" value={plan.id} />
                                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center">
                                             <TextField size="small" name="name" label="Name" defaultValue={plan.name} required />
                                             <TextField size="small" name="description" label="Description" />
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
                              </form>
                         ))}
                    </Stack>
               </Paper>
          </Stack>
     );
}
