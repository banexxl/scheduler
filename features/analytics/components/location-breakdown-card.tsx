"use client";

/**
 * Location Breakdown Card — Milestone 8.4.
 *
 * Shows appointment counts and value by location for multi-location tenants.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { LocationAnalyticsItem } from "../types/analytics";

type Props = {
  locations: LocationAnalyticsItem[];
  currency: string;
};

export default function LocationBreakdownCard({ locations, currency }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>By Location</Typography>

      {locations.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No location data for this period.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Location</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Completed</TableCell>
              <TableCell align="right">Cancelled</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.locationId}>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                    {loc.locationName}
                  </Typography>
                </TableCell>
                <TableCell align="right">{loc.appointmentCount}</TableCell>
                <TableCell align="right">{loc.completedCount}</TableCell>
                <TableCell align="right">{loc.cancelledCount}</TableCell>
                <TableCell align="right">
                  {loc.completedValue > 0
                    ? `${loc.completedValue.toLocaleString()} ${currency}`
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
