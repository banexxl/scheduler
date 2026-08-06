"use client";

/**
 * Public booking multi-step flow — Milestone 6.11.
 *
 * Steps:
 * 1. Service selection
 * 2. Location selection
 * 3. Resource preference (optional)
 * 4. Date & time selection
 * 5. Customer details
 * 6. Review
 * 7. Confirmation (after successful creation)
 */

import { useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import type {
  PublicBookableService,
  PublicBookingSettings,
  PublicBookingConfirmation,
  PublicAvailabilityOption,
} from "../types/public-booking";
import PublicServiceStep from "./public-service-step";
import PublicLocationStep from "./public-location-step";
import PublicDateTimeStep from "./public-date-time-step";
import PublicCustomerStep from "./public-customer-step";
import PublicBookingReview from "./public-booking-review";
import PublicBookingConfirmationView from "./public-booking-confirmation";

type Props = {
  tenantSlug: string;
  tenantName: string;
  tenantId: string;
  timeZone: string;
  settings: PublicBookingSettings;
  services: PublicBookableService[];
};

const STEP_LABELS = ["Service", "Location", "Date & Time", "Details", "Review"];

export default function PublicBookingFlow({
  tenantSlug,
  tenantName,
  tenantId,
  timeZone,
  settings,
  services,
}: Props) {
  const [step, setStep] = useState(0);

  // Selections
  const [selectedService, setSelectedService] = useState<PublicBookableService | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<PublicAvailabilityOption | null>(null);
  const [selectedResourceForSlot, setSelectedResourceForSlot] = useState<string | null>(null);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Result
  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation | null>(null);

  // ─── State Reset Rules ───────────────────────────────────────────────────

  const handleServiceSelect = useCallback((service: PublicBookableService) => {
    setSelectedService(service);
    setSelectedLocationId(null);
    setSelectedResourceId(null);
    setSelectedDate(null);
    setSelectedOption(null);
    setSelectedResourceForSlot(null);
    setStep(1);
  }, []);

  const handleLocationSelect = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedResourceId(null);
    setSelectedDate(null);
    setSelectedOption(null);
    setSelectedResourceForSlot(null);
    setStep(2); // Skip resource step if not allowed, go to date/time
  }, []);

  const handleDateTimeSelect = useCallback((option: PublicAvailabilityOption, resourceId: string) => {
    setSelectedOption(option);
    setSelectedResourceForSlot(resourceId);
    setStep(3);
  }, []);

  const handleCustomerSubmit = useCallback(() => {
    setStep(4);
  }, []);

  const handleConfirmation = useCallback((conf: PublicBookingConfirmation) => {
    setConfirmation(conf);
    setStep(5);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // Progress
  const totalSteps = STEP_LABELS.length;
  const progress = confirmation ? 100 : ((step + 1) / totalSteps) * 100;

  // ─── Render ──────────────────────────────────────────────────────────────

  if (confirmation) {
    return (
      <PublicBookingConfirmationView
        confirmation={confirmation}
      />
    );
  }

  return (
    <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
      {/* Header */}
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {settings.bookingPageTitle ?? `Book with ${tenantName}`}
      </Typography>
      {settings.bookingPageDescription && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {settings.bookingPageDescription}
        </Typography>
      )}

      {/* Progress */}
      <Box sx={{ mb: 3 }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Step {step + 1} of {totalSteps}: {STEP_LABELS[step]}
        </Typography>
      </Box>

      {/* Steps */}
      {step === 0 && (
        <PublicServiceStep
          services={services}
          showPrices={settings.showServicePrices}
          showDuration={settings.showServiceDuration}
          onSelect={handleServiceSelect}
        />
      )}

      {step === 1 && selectedService && (
        <PublicLocationStep
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          serviceId={selectedService.id}
          onSelect={handleLocationSelect}
          onBack={handleBack}
        />
      )}

      {step === 2 && selectedService && selectedLocationId && (
        <PublicDateTimeStep
          tenantSlug={tenantSlug}
          tenantId={tenantId}
          serviceId={selectedService.id}
          locationId={selectedLocationId}
          resourceId={selectedResourceId}
          settings={settings}
          timeZone={timeZone}
          onSelect={handleDateTimeSelect}
          onBack={handleBack}
        />
      )}

      {step === 3 && (
        <PublicCustomerStep
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerNotes={customerNotes}
          onChangeName={setCustomerName}
          onChangeEmail={setCustomerEmail}
          onChangePhone={setCustomerPhone}
          onChangeNotes={setCustomerNotes}
          onSubmit={handleCustomerSubmit}
          onBack={handleBack}
        />
      )}

      {step === 4 && selectedService && selectedOption && selectedResourceForSlot && (
        <PublicBookingReview
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          service={selectedService}
          locationId={selectedLocationId!}
          resourceId={selectedResourceForSlot}
          option={selectedOption}
          timeZone={timeZone}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          customerNotes={customerNotes}
          settings={settings}
          onConfirm={handleConfirmation}
          onBack={handleBack}
        />
      )}
    </Paper>
  );
}
