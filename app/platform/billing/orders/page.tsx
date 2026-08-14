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
import { listPlatformOrders } from "@/features/platform/services/platform-billing-order-queries";
import PolarConfigAlert from "@/features/platform/components/polar-config-alert";

export default async function PlatformBillingOrdersPage() {
     await requirePlatformAdmin();
     const orders = await listPlatformOrders({ limit: 50 });

     return (
          <Stack spacing={3}>
               <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
                    <div>
                         <Typography variant="h4" component="h1" gutterBottom>
                              Billing Orders
                         </Typography>
                         <Typography color="text.secondary">
                              Platform-level view of Polar order projections and sync state.
                         </Typography>
                    </div>
                    <Button component="a" href="/platform/billing" variant="outlined">
                         Back to billing
                    </Button>
               </Stack>

               <PolarConfigAlert />

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Tenant</TableCell>
                                        <TableCell>Order</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Paid</TableCell>
                                        <TableCell>Refunded</TableCell>
                                        <TableCell>Sync</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {orders.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={6}>No orders found.</TableCell>
                                        </TableRow>
                                   ) : (
                                        orders.map((order) => (
                                             <TableRow key={order.id}>
                                                  <TableCell>{order.tenantName ?? order.tenantId}</TableCell>
                                                  <TableCell>{order.orderNumber ?? order.polarOrderId}</TableCell>
                                                  <TableCell>{`${order.totalAmount} ${order.currency}`}</TableCell>
                                                  <TableCell>{order.isPaid ? "Yes" : "No"}</TableCell>
                                                  <TableCell>{order.refundedAmount}</TableCell>
                                                  <TableCell>{order.syncStatus}</TableCell>
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
