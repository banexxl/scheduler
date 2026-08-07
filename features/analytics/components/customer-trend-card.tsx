"use client";

/**
 * Customer Trend Card — Milestone 8.4.
 *
 * Shows new vs returning customer counts for the period.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import type { CustomerTrendPoint } from "../types/analytics";

type Props = {
  newCustomers: number;
  returningCustomers: number;
  trend: CustomerTrendPoint[];
};

export default function CustomerTrendCard({ newCustomers, returningCustomers }: Props) {
  const total = newCustomers + returningCustomers;
  const returnRate = total > 0 ? ((returningCustomers / total) * 100).toFixed(0) : "—";

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>Customers</Typography>

      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No customer activity this period.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">New</Typography>
            <Typography variant="body2" fontWeight={600}>{newCustomers}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">Returning</Typography>
            <Typography variant="body2" fontWeight={600}>{returningCustomers}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary">Return rate</Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main">
              {returnRate}%
            </Typography>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
