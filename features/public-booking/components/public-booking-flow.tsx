"use client";

/**
 * Public booking multi-step flow — Milestones 6.11, 8.5.
 *
 * Steps:
 * 1. Service selection
 * 2. Location selection
 * 3. Date & time selection
 * 4. Customer details
 * 5. Review
 * 6. Confirmation (after successful creation)
 */

import { useState, useCallback } from "react";
import type {
  PublicBookableService,
  PublicBookingSettings,
  PublicBookingTenant,
  PublicBookingConfirmation,
  PublicAvailabilityOption,
} from "../types/public-booking";
import PublicBookingShell from "./public-booking-shell";
import PublicBookingConfirmationView from "./public-booking-confirmation";
import PublicServiceStep from "./public-service-step";
import PublicDateTimeStep from "./public-date-time-step";
import PublicLocationStep from "./public-location-step";
import PublicCustomerStep from "./public-customer-step";
import PublicBookingReview from "./public-booking-review";

type Props = {
  tenantSlug: string;
  tenant: PublicBookingTenant;
  timeZone: string;
  settings: PublicBookingSettings;
  services: PublicBookableService[];
};

const STEP_LABELS = ["Service", "Location", "Date & Time", "Details", "Review"];

export default function PublicBookingFlow({
  tenantSlug,
  tenant,
  timeZone,
  settings,
  services,
}: Props) {
  const [step, setStep] = useState(0);

  // Selections
  const [selectedService, setSelectedService] = useState<PublicBookableService | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [, setSelectedDate] = useState<string | null>(null);
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

  // ─── Render ──────────────────────────────────────────────────────────────

  if (confirmation) {
    return (
      <PublicBookingShell
        tenant={tenant}
        settings={settings}
        currentStep={totalSteps - 1}
        totalSteps={totalSteps}
        isConfirmed={true}
      >
        <PublicBookingConfirmationView
          confirmation={confirmation}
          tenantSlug={tenantSlug}
        />
      </PublicBookingShell>
    );
  }

  return (
    <PublicBookingShell
      tenant={tenant}
      settings={settings}
      currentStep={step}
      totalSteps={totalSteps}
      isConfirmed={false}
    >
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
          tenantId={tenant.id}
          serviceId={selectedService.id}
          onSelect={handleLocationSelect}
          onBack={handleBack}
        />
      )}

      {step === 2 && selectedService && selectedLocationId && (
        <PublicDateTimeStep
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
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
          tenantName={tenant.name}
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
    </PublicBookingShell>
  );
}
