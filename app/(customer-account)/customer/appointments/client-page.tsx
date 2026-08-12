"use client";

/**
 * Customer Appointments Client — Milestone 14.3.
 *
 * Mobile-first appointment list with tabs: Upcoming / Past / Cancelled.
 * Card-based layout, not a table.
 */

import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import type { CustomerUnifiedAppointment } from "@/features/customer-account/types/unified-customer";
import {
  customerPalette,
  customerTypography,
} from "@/styles/theme/customer-tokens";

type Props = {
  appointments: CustomerUnifiedAppointment[];
  activeFilter: "upcoming" | "past" | "cancelled";
};

const FILTER_MAP = { upcoming: 0, past: 1, cancelled: 2 };
const TAB_LABELS = ["Upcoming", "Past", "Cancelled"];

function getStatusColor(status: string): "success" | "warning" | "error" | "info" | "default" {
  switch (status) {
    case "confirmed": return "success";
    case "checked_in": case "in_progress": return "info";
    case "completed": return "default";
    case "cancelled": return "error";
    case "no_show": return "warning";
    default: return "default";
  }
}

function formatStatus(status: string): string {
  switch (status) {
    case "confirmed": return "Confirmed";
    case "checked_in": return "Checked in";
    case "in_progress": return "In progress";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "no_show": return "No-show";
    default: return status;
  }
}

export default function CustomerAppointmentsClient({ appointments, activeFilter }: Props) {
  const router = useRouter();

  const handleTabChange = (_: unknown, value: number) => {
    const filters = ["upcoming", "past", "cancelled"];
    router.push(`/customer/appointments?filter=${filters[value]}`);
  };

  return (
    <Stack spacing={2.5}>
      <Typography sx={customerTypography.pageTitle}>Appointments</Typography>

      {/* Tabs */}
      <Tabs
        value={FILTER_MAP[activeFilter]}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          borderBottom: `1px solid ${customerPalette.card.border}`,
          "& .MuiTab-root": { textTransform: "none", fontSize: "0.875rem", fontWeight: 500 },
        }}
      >
        {TAB_LABELS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {/* Appointment cards */}
      {appointments.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography sx={customerTypography.body}>
            {activeFilter === "upcoming"
              ? "No upcoming appointments"
              : activeFilter === "past"
                ? "No past appointments yet"
                : "No cancelled appointments"}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {appointments.map((appt) => (
            <Box
              key={appt.appointmentNumber}
              sx={{
                p: 2,
                borderRadius: `${customerPalette.card.radius}px`,
                bgcolor: customerPalette.page.surface,
                border: `1px solid ${customerPalette.card.border}`,
                boxShadow: customerPalette.card.shadow,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={customerTypography.cardTitle}>
                    {appt.serviceName}
                  </Typography>
                  <Typography sx={{ ...customerTypography.body, mt: 0.25 }}>
                    {appt.localDate} at {appt.localStartTime}
                  </Typography>
                  <Typography sx={customerTypography.meta}>
                    {appt.tenantName} • {appt.locationName}
                  </Typography>
                </Box>
                <Chip
                  label={formatStatus(appt.status)}
                  color={getStatusColor(appt.status)}
                  size="small"
                  sx={{ fontSize: "0.7rem", height: 22 }}
                />
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
