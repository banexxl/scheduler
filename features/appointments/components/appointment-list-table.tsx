"use client";

/**
 * Appointment list table component — Milestone 6.9.
 *
 * Displays appointments in a responsive table with status chips,
 * formatted dates, and action links.
 */

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import type { AppointmentListItem, AppointmentStatus } from "../types/appointment";
import { APPOINTMENT_STATUS_LABELS } from "../types/appointment";

// ─── Status Color Map ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AppointmentStatus, "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"> = {
    pending: "warning",
    confirmed: "primary",
    checked_in: "info",
    in_progress: "secondary",
    completed: "success",
    cancelled: "error",
    no_show: "default",
};

// ─── Date Formatting ─────────────────────────────────────────────────────────

function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPrice(price: string, currency: string): string {
    const numericPrice = parseFloat(price);
    if (numericPrice === 0) return "Free";
    return `${numericPrice.toFixed(2)} ${currency}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
    appointments: AppointmentListItem[];
    total: number;
    tenantSlug: string;
    canEdit: boolean;
    filters: Record<string, string | undefined>;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppointmentListTable({
    appointments,
    total,
    tenantSlug,
    canEdit,
}: Props) {
    if (appointments.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    No appointments found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {canEdit
                        ? "Create your first appointment to get started."
                        : "No appointments match your current filters."}
                </Typography>
            </Paper>
        );
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Showing {appointments.length} of {total} appointments
            </Typography>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Number</TableCell>
                            <TableCell>Date & Time</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Service</TableCell>
                            <TableCell>Resource</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Price</TableCell>
                            {canEdit && <TableCell>Actions</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {appointments.map((appointment) => (
                            <TableRow key={appointment.id} hover>
                                <TableCell>
                                    <Link
                                        component="a"
                                        href={`/${tenantSlug}/appointments/${appointment.id}`}
                                        underline="hover"
                                        sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}
                                    >
                                        {appointment.appointmentNumber}
                                    </Link>
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                    {formatDateTime(appointment.startsAt)}
                                </TableCell>
                                <TableCell>{appointment.customerName}</TableCell>
                                <TableCell>{appointment.serviceNameSnapshot}</TableCell>
                                <TableCell>{appointment.resourceNameSnapshot}</TableCell>
                                <TableCell>{appointment.locationNameSnapshot}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={APPOINTMENT_STATUS_LABELS[appointment.status]}
                                        color={STATUS_COLORS[appointment.status]}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                    {formatPrice(appointment.price, appointment.currency)}
                                </TableCell>
                                {canEdit && (
                                    <TableCell>
                                        <Link
                                            component="a"
                                            href={`/${tenantSlug}/appointments/${appointment.id}/edit`}
                                            variant="body2"
                                            underline="hover"
                                        >
                                            Edit
                                        </Link>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
