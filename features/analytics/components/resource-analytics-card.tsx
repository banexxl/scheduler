"use client";

/**
 * Resource Analytics Card — Milestone 8.4.
 *
 * Shows busiest resources with appointment counts and scheduled minutes.
 * Neutral wording — not framed as performance scoring.
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { ResourceAnalyticsItem } from "../types/analytics";

type Props = {
  resources: ResourceAnalyticsItem[];
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ResourceAnalyticsCard({ resources }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="subtitle2" gutterBottom>Busiest Resources</Typography>

      {resources.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No resource data for this period.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Resource</TableCell>
              <TableCell align="right">Appts</TableCell>
              <TableCell align="right">Completed</TableCell>
              <TableCell align="right">Scheduled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resources.slice(0, 8).map((r) => (
              <TableRow key={r.resourceId}>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                    {r.resourceName}
                  </Typography>
                </TableCell>
                <TableCell align="right">{r.appointmentCount}</TableCell>
                <TableCell align="right">{r.completedCount}</TableCell>
                <TableCell align="right">{formatMinutes(r.scheduledMinutes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
