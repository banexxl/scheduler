"use client";

/**
 * Top Services Card — Milestone 8.4.
 *
 * Ranked list of services by appointment count with completed value.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { TopServiceItem } from "../types/analytics";

type Props = {
  services: TopServiceItem[];
  currency: string;
};

export default function TopServicesCard({ services, currency }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>Top Services</Typography>

      {services.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No service data for this period.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell align="right">Bookings</TableCell>
              <TableCell align="right">Completed</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.slice(0, 8).map((s) => (
              <TableRow key={s.serviceId}>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                    {s.serviceName}
                  </Typography>
                </TableCell>
                <TableCell align="right">{s.appointmentCount}</TableCell>
                <TableCell align="right">{s.completedCount}</TableCell>
                <TableCell align="right">
                  {s.completedValue > 0
                    ? `${s.completedValue.toLocaleString()} ${currency}`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
