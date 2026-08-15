"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Alert from "@mui/material/Alert";
import type { TenantFinancialHistoryItem, TenantPaymentSummary } from "@/features/payments/types/financial-history";
import { formatMinorUnits } from "@/features/payments/utils/currency-minor-units";

type Props = {
  tenantSlug: string;
  history: TenantFinancialHistoryItem[];
  summary: TenantPaymentSummary;
  dateFrom: string;
  dateTo: string;
  typeFilter: string | null;
};

export default function PaymentsClientPage({ history, summary }: Props) {
  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        {summary.currencies.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2, flex: 1, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No payments in this period</Typography>
          </Paper>
        ) : (
          summary.currencies.map((c) => (
            <Paper key={c.currency} variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Typography variant="caption" color="text.secondary">{c.currency}</Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatMinorUnits(c.paymentsReceived, c.currency)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Payments received</Typography>
              {c.refunded > 0 && (
                <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                  Refunded: {formatMinorUnits(c.refunded, c.currency)}
                </Typography>
              )}
              <Typography variant="body2" color="success.main">
                Net: {formatMinorUnits(c.netCustomerPayments, c.currency)}
              </Typography>
            </Paper>
          ))
        )}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">Totals</Typography>
            <Typography variant="body2">Appointments: {summary.totalAppointmentPayments}</Typography>
            <Typography variant="body2">Packages: {summary.totalPackagePurchases}</Typography>
            <Typography variant="body2">Refunds: {summary.totalRefunds}</Typography>
          </Stack>
        </Paper>
      </Stack>

      {history.length === 0 ? (
        <Alert severity="info">No customer payments yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Paid</TableCell>
                <TableCell align="right">Refunded</TableCell>
                <TableCell align="right">Net</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.paidAt ? new Date(item.paidAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={item.type === "appointment_payment" ? "Appointment" : "Package"} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Chip label={item.status} size="small" color={item.status === "paid" || item.status === "fulfilled" ? "success" : item.status === "refunded" ? "default" : "warning"} />
                  </TableCell>
                  <TableCell align="right">{formatMinorUnits(item.paidAmount, item.currency)}</TableCell>
                  <TableCell align="right">{item.refundedAmount > 0 ? formatMinorUnits(item.refundedAmount, item.currency) : "—"}</TableCell>
                  <TableCell align="right">{formatMinorUnits(item.netCustomerPayment, item.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
