"use client";

/**
 * Customer Dashboard Client — Milestone 9.2.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import type { CustomerDashboardSummary } from "@/features/customer-account/types/unified-customer";
import type { LinkedBusiness } from "@/features/customer-account/types/customer-account";

type Props = {
  accountName: string | null;
  summary: CustomerDashboardSummary;
  businesses: LinkedBusiness[];
};

export default function CustomerDashboardClient({ accountName, summary, businesses }: Props) {
  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: 3, px: { xs: 2, sm: 0 } }}>
      {/* Greeting */}
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {accountName ? `Hello, ${accountName}` : "Welcome back"}
      </Typography>

      {/* Quick Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700}>{summary.upcomingCount}</Typography>
          <Typography variant="caption" color="text.secondary">Upcoming</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700}>{summary.linkedBusinessCount}</Typography>
          <Typography variant="caption" color="text.secondary">Businesses</Typography>
        </Paper>
      </Stack>

      {/* Next Appointment */}
      {summary.nextAppointment && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Next appointment</Typography>
          <Typography variant="subtitle1" fontWeight={600}>
            {summary.nextAppointment.serviceName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.nextAppointment.tenantName} • {summary.nextAppointment.localDate} • {summary.nextAppointment.localStartTime}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.nextAppointment.locationName}
          </Typography>
        </Paper>
      )}

      {/* Linked Businesses */}
      <Typography variant="h6" gutterBottom>Your businesses</Typography>
      {businesses.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Your businesses will appear here after you book or link an existing appointment.
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {businesses.map((b) => (
            <Paper key={b.tenantId} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>{b.tenantName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Linked {new Date(b.linkedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Button
                  component="a"
                  href={`/book/${b.tenantSlug}`}
                  size="small"
                  variant="outlined"
                >
                  Book
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Navigation */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button component="a" href="/customer/appointments" variant="text" size="small">
          All appointments
        </Button>
        <Button component="a" href="/customer/rewards" variant="text" size="small">
          Rewards
        </Button>
        <Button component="a" href="/customer/account" variant="text" size="small">
          Account settings
        </Button>
      </Stack>
    </Box>
  );
}
