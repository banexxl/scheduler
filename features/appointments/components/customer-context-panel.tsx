"use client";

/**
 * Customer Context Panel — Milestone 8.3.
 *
 * Compact CRM context displayed on the appointment detail page.
 * Shows customer info, tags, blocked state, appointment history stats,
 * and a link to the full customer profile.
 *
 * Does not duplicate the full CRM — just the relevant operational context.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import type { AppointmentCustomerContext } from "../services/get-appointment-customer-context";

type Props = {
  context: AppointmentCustomerContext;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CustomerContextPanel({ context }: Props) {
  return (
    <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, mb: 3 }}>
      <Typography variant="h6" gutterBottom>Customer</Typography>

      {context.isBlocked && (
        <Alert severity="error" sx={{ mb: 2 }}>
          This customer is blocked{context.blockedReason ? `: ${context.blockedReason}` : ""}
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Name</Typography>
          <Typography variant="body2" fontWeight={600}>{context.customerName}</Typography>
        </Box>
        {context.customerEmail && (
          <Box>
            <Typography variant="caption" color="text.secondary">Email</Typography>
            <Typography variant="body2">{context.customerEmail}</Typography>
          </Box>
        )}
        {context.customerPhone && (
          <Box>
            <Typography variant="caption" color="text.secondary">Phone</Typography>
            <Typography variant="body2">{context.customerPhone}</Typography>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">Total Appointments</Typography>
          <Typography variant="body2">{context.totalAppointments}</Typography>
        </Box>
        {context.noShowCount > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary">Previous No-shows</Typography>
            <Typography variant="body2" color="warning.main" fontWeight={600}>
              {context.noShowCount}
            </Typography>
          </Box>
        )}
        {context.lastAppointmentAt && (
          <Box>
            <Typography variant="caption" color="text.secondary">Last Appointment</Typography>
            <Typography variant="body2">{formatDate(context.lastAppointmentAt)}</Typography>
          </Box>
        )}
      </Box>

      {context.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          {context.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Stack>
      )}

      {context.customerProfileUrl && (
        <Box sx={{ mt: 2 }}>
          <Button
            component="a"
            href={context.customerProfileUrl}
            size="small"
            variant="text"
          >
            View customer profile &rarr;
          </Button>
        </Box>
      )}
    </Paper>
  );
}
