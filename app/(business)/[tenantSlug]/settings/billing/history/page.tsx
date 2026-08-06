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
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { listTenantBillingHistory } from "@/features/billing/services/list-tenant-billing-history";

export default async function TenantBillingHistoryPage({
     params,
}: {
     params: Promise<{ tenantSlug: string }>;
}) {
     const { tenantSlug } = await params;
     const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
     const history = await listTenantBillingHistory(tenant.id);

     return (
          <Stack spacing={3}>
               <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                         Billing History
                    </Typography>
                    <Typography color="text.secondary">
                         A synchronized view of Polar orders and refunds for this tenant.
                    </Typography>
               </Box>

               <Button component={Link} href={`/${tenantSlug}/settings/billing`} variant="outlined" sx={{ width: "fit-content" }}>
                    Back to Billing
               </Button>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Order</TableCell>
                                        <TableCell>Reason</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Refunded</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {history.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={6}>No billing history yet.</TableCell>
                                        </TableRow>
                                   ) : (
                                        history.map((item) => (
                                             <TableRow key={item.id}>
                                                  <TableCell>{item.paidAt ?? item.order.createdAt}</TableCell>
                                                  <TableCell>{item.orderNumber ?? item.order.polarOrderId}</TableCell>
                                                  <TableCell>{item.billingReason ?? "-"}</TableCell>
                                                  <TableCell>{`${item.amount} ${item.currency}`}</TableCell>
                                                  <TableCell>{item.paymentStatus}</TableCell>
                                                  <TableCell>{`${item.refundedAmount} ${item.currency}`}</TableCell>
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
