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

export default async function TenantBillingOverviewPage({
     params,
}: {
     params: Promise<{ tenantSlug: string }>;
}) {
     const { tenantSlug } = await params;
     const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);

     const overview = await getTenantBillingOverview(tenant.id);

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

               <Typography variant="body2" color="text.secondary">
                    Next milestone: local subscription lifecycle projection and activation checks.
               </Typography>
          </Stack>
     );
}
