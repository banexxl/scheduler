import Link from "next/link";
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
import { listPlatformRefunds } from "@/features/platform/services/platform-billing-order-queries";

export default async function PlatformBillingRefundsPage() {
     await requirePlatformAdmin();
     const refunds = await listPlatformRefunds({ limit: 50 });

     return (
          <Stack spacing={3}>
               <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems="center">
                    <div>
                         <Typography variant="h4" component="h1" gutterBottom>
                              Billing Refunds
                         </Typography>
                         <Typography color="text.secondary">
                              Platform-level view of Polar refund projections and sync state.
                         </Typography>
                    </div>
                    <Button component={Link} href="/platform/billing" variant="outlined">
                         Back to billing
                    </Button>
               </Stack>

               <Paper variant="outlined" sx={{ p: 2 }}>
                    <TableContainer>
                         <Table size="small">
                              <TableHead>
                                   <TableRow>
                                        <TableCell>Tenant</TableCell>
                                        <TableCell>Order</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Sync</TableCell>
                                   </TableRow>
                              </TableHead>
                              <TableBody>
                                   {refunds.length === 0 ? (
                                        <TableRow>
                                             <TableCell colSpan={5}>No refunds found.</TableCell>
                                        </TableRow>
                                   ) : (
                                        refunds.map((refund) => (
                                             <TableRow key={refund.id}>
                                                  <TableCell>{refund.tenantName ?? refund.tenantId}</TableCell>
                                                  <TableCell>{refund.orderNumber ?? refund.polarOrderId}</TableCell>
                                                  <TableCell>{`${refund.amount} ${refund.currency}`}</TableCell>
                                                  <TableCell>{refund.status}</TableCell>
                                                  <TableCell>{refund.syncStatus}</TableCell>
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
