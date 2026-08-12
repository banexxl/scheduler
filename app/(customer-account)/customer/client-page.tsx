"use client";

/**
 * Customer Dashboard Client — Milestone 14.3.
 *
 * Mobile-first consumer dashboard showing:
 * - Greeting
 * - Next appointment (prominent)
 * - Quick stats
 * - Linked businesses
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import type { CustomerDashboardSummary } from "@/features/customer-account/types/unified-customer";
import type { LinkedBusiness } from "@/features/customer-account/types/customer-account";
import {
  customerPalette,
  customerTypography,
} from "@/styles/theme/customer-tokens";

type Props = {
  accountName: string | null;
  summary: CustomerDashboardSummary;
  businesses: LinkedBusiness[];
};

export default function CustomerDashboardClient({ accountName, summary, businesses }: Props) {
  return (
    <Stack spacing={3}>
      {/* Greeting */}
      <Typography sx={customerTypography.greeting}>
        {accountName ? `Hello, ${accountName}` : "Welcome back"}
      </Typography>

      {/* Next Appointment */}
      {summary.nextAppointment ? (
        <Box
          sx={{
            p: 2.5,
            borderRadius: `${customerPalette.card.radius}px`,
            bgcolor: customerPalette.page.surface,
            boxShadow: customerPalette.card.shadow,
            border: `1px solid ${customerPalette.card.border}`,
          }}
        >
          <Typography sx={{ ...customerTypography.meta, mb: 0.5 }}>Next appointment</Typography>
          <Typography sx={customerTypography.cardTitle}>
            {summary.nextAppointment.serviceName}
          </Typography>
          <Typography sx={{ ...customerTypography.body, mt: 0.5 }}>
            {summary.nextAppointment.localDate} at {summary.nextAppointment.localStartTime}
          </Typography>
          <Typography sx={customerTypography.meta}>
            {summary.nextAppointment.tenantName} • {summary.nextAppointment.locationName}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            p: 3,
            borderRadius: `${customerPalette.card.radius}px`,
            bgcolor: customerPalette.accent.primaryLight,
            textAlign: "center",
          }}
        >
          <Typography sx={{ ...customerTypography.body, mb: 1 }}>
            No upcoming appointments
          </Typography>
          {businesses.length > 0 && businesses[0] && (
            <Button
              href={`/book/${businesses[0].tenantSlug}`}
              variant="contained"
              size="small"
              sx={{ textTransform: "none" }}
            >
              Book an appointment
            </Button>
          )}
        </Box>
      )}

      {/* Quick stats */}
      <Stack direction="row" spacing={2}>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: `${customerPalette.card.radius}px`,
            bgcolor: customerPalette.page.surface,
            border: `1px solid ${customerPalette.card.border}`,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: customerPalette.accent.primary }}>
            {summary.upcomingCount}
          </Typography>
          <Typography sx={customerTypography.caption}>Upcoming</Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            p: 2,
            borderRadius: `${customerPalette.card.radius}px`,
            bgcolor: customerPalette.page.surface,
            border: `1px solid ${customerPalette.card.border}`,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: customerPalette.accent.primary }}>
            {summary.linkedBusinessCount}
          </Typography>
          <Typography sx={customerTypography.caption}>Businesses</Typography>
        </Box>
      </Stack>

      {/* Linked Businesses */}
      <Box>
        <Typography sx={{ ...customerTypography.sectionTitle, mb: 1.5 }}>
          Your businesses
        </Typography>
        {businesses.length === 0 ? (
          <Typography sx={customerTypography.meta}>
            Your businesses will appear here after you book or link an existing appointment.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {businesses.map((b) => (
              <Box
                key={b.tenantId}
                sx={{
                  p: 2,
                  borderRadius: `${customerPalette.card.radius}px`,
                  bgcolor: customerPalette.page.surface,
                  border: `1px solid ${customerPalette.card.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={customerTypography.cardTitle}>{b.tenantName}</Typography>
                  <Typography sx={customerTypography.caption}>
                    Linked {new Date(b.linkedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Button
                  href={`/book/${b.tenantSlug}`}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: "none", borderRadius: 2 }}
                >
                  Book
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
