"use client";

/**
 * Multi-step appointment creation form — Milestone 6.9.
 *
 * Flow:
 * 1. Select service
 * 2. Select location
 * 3. Select date
 * 4. Load and select available slot (optionally filter by resource)
 * 5. Enter customer information
 * 6. Confirm and create
 *
 * Shows: "Availability is checked again when the appointment is created."
 */

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import { useRouter } from "next/navigation";
import { getAvailabilityPreview } from "@/features/availability/actions/get-availability-preview";
import { createAppointmentAction } from "../actions/create-appointment-action";
import type { AvailabilitySlot } from "@/features/availability/types/availability";

// ─── Types ───────────────────────────────────────────────────────────────────

type EntityOption = { id: string; name: string };

type Props = {
    tenantSlug: string;
    services: EntityOption[];
    locations: EntityOption[];
    resources: EntityOption[];
};

const STEPS = ["Service & Location", "Date & Time", "Customer Details", "Confirm"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppointmentCreateForm({
    tenantSlug,
    services,
    locations,
    resources,
}: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Step state
    const [activeStep, setActiveStep] = useState(0);

    // Form state
    const [serviceId, setServiceId] = useState("");
    const [locationId, setLocationId] = useState("");
    const [resourceId, setResourceId] = useState("");
    const [localDate, setLocalDate] = useState("");
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [internalNotes, setInternalNotes] = useState("");
    const [customerNotes, setCustomerNotes] = useState("");

    // Availability state
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState("");

    // Submission state
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // ─── Load Slots ──────────────────────────────────────────────────────────

    async function loadSlots() {
        if (!serviceId || !locationId || !localDate) return;

        setLoadingSlots(true);
        setSlotsError("");
        setSlots([]);
        setSelectedSlot(null);

        const result = await getAvailabilityPreview(tenantSlug, {
            serviceId,
            locationId,
            resourceId: resourceId || undefined,
            localDate,
        });

        setLoadingSlots(false);

        if (!result.success) {
            setSlotsError(result.error);
            return;
        }

        // Flatten all resource slots
        const allSlots = result.data.resources.flatMap((r) => r.slots);
        setSlots(allSlots);

        if (allSlots.length === 0) {
            setSlotsError(result.data.reasonCode
                ? `No available times (${result.data.reasonCode})`
                : "No available times for this date");
        }
    }

    // ─── Submit ────────────────────────────────────────────────────────────────

    async function handleSubmit() {
        if (!selectedSlot) return;

        setSubmitting(true);
        setError("");

        const result = await createAppointmentAction(tenantSlug, {
            serviceId,
            locationId,
            resourceId: selectedSlot.resourceId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim() || null,
            customerPhone: customerPhone.trim() || null,
            localDate,
            localStartTime: selectedSlot.localStartTime,
            internalNotes: internalNotes.trim() || null,
            customerNotes: customerNotes.trim() || null,
        });

        setSubmitting(false);

        if (!result.success) {
            setError(result.error);
            return;
        }

        startTransition(() => {
            router.push(`/${tenantSlug}/appointments/${result.data.id}`);
        });
    }

    // ─── Step Navigation ───────────────────────────────────────────────────────

    function canAdvance(): boolean {
        switch (activeStep) {
            case 0: return !!serviceId && !!locationId;
            case 1: return !!selectedSlot;
            case 2: return customerName.trim().length >= 1;
            case 3: return true;
            default: return false;
        }
    }

    function handleNext() {
        if (activeStep === 0 && localDate) {
            // Pre-load slots when advancing to step 1
        }
        setActiveStep((prev) => prev + 1);
    }

    function handleBack() {
        setActiveStep((prev) => prev - 1);
    }

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 } }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                {STEPS.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
                    {error}
                </Alert>
            )}

            {/* Step 0: Service & Location */}
            {activeStep === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <TextField
                        select
                        label="Service"
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                        fullWidth
                        required
                    >
                        <MenuItem value="" disabled>Select a service</MenuItem>
                        {services.map((s) => (
                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Location"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        fullWidth
                        required
                    >
                        <MenuItem value="" disabled>Select a location</MenuItem>
                        {locations.map((l) => (
                            <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select
                        label="Resource (optional)"
                        value={resourceId}
                        onChange={(e) => setResourceId(e.target.value)}
                        fullWidth
                        helperText="Leave empty to see all available resources"
                    >
                        <MenuItem value="">Any resource</MenuItem>
                        {resources.map((r) => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                    </TextField>
                </Box>
            )}

            {/* Step 1: Date & Time */}
            {activeStep === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
                        <TextField
                            type="date"
                            label="Date"
                            value={localDate}
                            onChange={(e) => {
                                setLocalDate(e.target.value);
                                setSelectedSlot(null);
                                setSlots([]);
                            }}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            required
                        />
                        <Button
                            variant="outlined"
                            onClick={loadSlots}
                            disabled={!localDate || loadingSlots}
                            sx={{ whiteSpace: "nowrap", minWidth: 140 }}
                        >
                            {loadingSlots ? <CircularProgress size={20} /> : "Load Times"}
                        </Button>
                    </Box>

                    {slotsError && (
                        <Alert severity="warning">{slotsError}</Alert>
                    )}

                    {slots.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Available times ({slots.length})
                            </Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                {slots.map((slot) => (
                                    <Chip
                                        key={`${slot.resourceId}-${slot.startsAt}`}
                                        label={`${slot.localStartTime}–${slot.localEndTime}`}
                                        onClick={() => setSelectedSlot(slot)}
                                        color={selectedSlot?.startsAt === slot.startsAt && selectedSlot?.resourceId === slot.resourceId ? "primary" : "default"}
                                        variant={selectedSlot?.startsAt === slot.startsAt && selectedSlot?.resourceId === slot.resourceId ? "filled" : "outlined"}
                                        clickable
                                    />
                                ))}
                            </Box>
                            {selectedSlot && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Selected: {selectedSlot.localStartTime}–{selectedSlot.localEndTime}
                                    {" "}({selectedSlot.durationMinutes} min)
                                    {" | "}Resource: {resources.find((r) => r.id === selectedSlot.resourceId)?.name ?? selectedSlot.resourceId}
                                    {" | "}{parseFloat(selectedSlot.price) > 0 ? `${selectedSlot.price} ${selectedSlot.currency}` : "Free"}
                                </Typography>
                            )}
                        </Box>
                    )}

                    <Alert severity="info" variant="outlined">
                        Availability is checked again when the appointment is created.
                    </Alert>
                </Box>
            )}

            {/* Step 2: Customer Details */}
            {activeStep === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <TextField
                        label="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        fullWidth
                        required
                        inputProps={{ maxLength: 160 }}
                    />
                    <TextField
                        label="Customer Email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label="Customer Phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        fullWidth
                    />
                    <TextField
                        label="Internal Notes"
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        inputProps={{ maxLength: 5000 }}
                        helperText="Visible only to staff"
                    />
                    <TextField
                        label="Customer Notes"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        inputProps={{ maxLength: 2000 }}
                    />
                </Box>
            )}

            {/* Step 3: Confirm */}
            {activeStep === 3 && selectedSlot && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Typography variant="h6">Confirm Appointment</Typography>
                    <Box component="dl" sx={{ "& dt": { fontWeight: 600, mt: 1 }, "& dd": { ml: 0 } }}>
                        <dt>Service</dt>
                        <dd>{services.find((s) => s.id === serviceId)?.name}</dd>
                        <dt>Location</dt>
                        <dd>{locations.find((l) => l.id === locationId)?.name}</dd>
                        <dt>Resource</dt>
                        <dd>{resources.find((r) => r.id === selectedSlot.resourceId)?.name ?? "—"}</dd>
                        <dt>Date & Time</dt>
                        <dd>{localDate} at {selectedSlot.localStartTime}–{selectedSlot.localEndTime}</dd>
                        <dt>Duration</dt>
                        <dd>{selectedSlot.durationMinutes} minutes</dd>
                        <dt>Price</dt>
                        <dd>{parseFloat(selectedSlot.price) > 0 ? `${selectedSlot.price} ${selectedSlot.currency}` : "Free"}</dd>
                        <dt>Customer</dt>
                        <dd>{customerName}{customerEmail ? ` (${customerEmail})` : ""}</dd>
                    </Box>

                    <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                        Availability is checked again when the appointment is created.
                    </Alert>
                </Box>
            )}

            {/* Navigation */}
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Button
                    onClick={handleBack}
                    disabled={activeStep === 0 || submitting}
                    variant="outlined"
                >
                    Back
                </Button>

                {activeStep < STEPS.length - 1 ? (
                    <Button
                        onClick={handleNext}
                        disabled={!canAdvance()}
                        variant="contained"
                    >
                        Next
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || !canAdvance() || isPending}
                        variant="contained"
                        color="primary"
                    >
                        {submitting ? <CircularProgress size={20} /> : "Create Appointment"}
                    </Button>
                )}
            </Box>
        </Paper>
    );
}
