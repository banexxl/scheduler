"use client";

/**
 * Public booking multi-step flow — Milestones 6.11, 8.5, 15.12.
 *
 * Steps:
 * 1. Service selection
 * 2. Location selection
 * 3. Date & time selection
 * 4. Recurrence (optional — skipped if not available)
 * 5. Customer details
 * 6. Payment / credits / gift card (conditional — skipped for free/recurring)
 * 7. Review
 * 8. Confirmation (after successful creation)
 *
 * Recurrence restriction (Milestone 15.1 policies):
 * - Recurring series are pay-at-business ONLY
 * - Online payment, package credits, and gift cards are disabled for series
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  PublicBookableService,
  PublicBookingSettings,
  PublicBookingTenant,
  PublicBookingConfirmation,
  PublicAvailabilityOption,
  PublicPaymentMethod,
} from "../types/public-booking";
import PublicBookingShell from "./public-booking-shell";
import PublicBookingConfirmationView from "./public-booking-confirmation";
import PublicServiceStep from "./public-service-step";
import PublicDateTimeStep from "./public-date-time-step";
import PublicLocationStep from "./public-location-step";
import PublicCustomerStep from "./public-customer-step";
import PublicBookingReview from "./public-booking-review";
import PublicPaymentStep from "./public-payment-step";
import PublicRecurrenceStep from "./public-recurrence-step";
import type { GiftCardReservation, PackageOption, PaymentMethod } from "./public-payment-step";
import type { PublicRecurrenceSelection } from "./public-recurrence-step";
import { getEligiblePackagesAction } from "../actions/get-eligible-packages-action";

type Props = {
  tenantSlug: string;
  tenant: PublicBookingTenant;
  timeZone: string;
  settings: PublicBookingSettings;
  services: PublicBookableService[];
  /** Whether gift cards are enabled for this tenant (effective state) */
  giftCardsEnabled?: boolean;
  /** Whether online payment is enabled and required for selected service */
  onlinePaymentEnabled?: boolean;
  /** Whether payment is required for booking */
  paymentRequired?: boolean;
  /** Eligible package options for authenticated customer */
  packageOptions?: PackageOption[];
  /** Whether recurring appointments are available */
  recurringEnabled?: boolean;
};

export default function PublicBookingFlow({
  tenantSlug,
  tenant,
  timeZone,
  settings,
  services,
  giftCardsEnabled = false,
  onlinePaymentEnabled = false,
  paymentRequired = false,
  packageOptions = [],
  recurringEnabled = true,
}: Props) {
  const [step, setStep] = useState(0);

  // Selections
  const [selectedService, setSelectedService] = useState<PublicBookableService | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [, setSelectedDate] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<PublicAvailabilityOption | null>(null);
  const [selectedResourceForSlot, setSelectedResourceForSlot] = useState<string | null>(null);

  // Recurrence
  const [recurrenceSelection, setRecurrenceSelection] = useState<PublicRecurrenceSelection | null>(null);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_business");
  const [giftCardReservation, setGiftCardReservation] = useState<GiftCardReservation | null>(null);
  const [selectedPackageOption, setSelectedPackageOption] = useState<PackageOption | null>(null);
  const [dynamicPackageOptions, setDynamicPackageOptions] = useState<PackageOption[]>([]);

  // Result
  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation | null>(null);

  // ─── Dynamic Package Loading ─────────────────────────────────────────────

  useEffect(() => {
    if (!selectedService) {
      setDynamicPackageOptions([]);
      return;
    }

    let cancelled = false;
    getEligiblePackagesAction(tenantSlug, selectedService.id).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setDynamicPackageOptions(result.packages);
      } else {
        setDynamicPackageOptions([]);
      }
    }).catch(() => {
      if (!cancelled) setDynamicPackageOptions([]);
    });

    return () => { cancelled = true; };
  }, [tenantSlug, selectedService]);

  const effectivePackageOptions = useMemo(
    () => dynamicPackageOptions.length > 0 ? dynamicPackageOptions : packageOptions,
    [dynamicPackageOptions, packageOptions]
  );

  // ─── Conditional Steps ───────────────────────────────────────────────────

  const isRecurring = recurrenceSelection?.enabled === true;

  // Payment step: shown if service has price AND payment options exist AND not recurring
  const showPaymentStep = useMemo(() => {
    if (isRecurring) return false; // Recurring = pay at business only
    if (!selectedService) return false;
    const price = parseFloat(selectedService.price);
    if (price <= 0) return false;
    return giftCardsEnabled || onlinePaymentEnabled || paymentRequired || effectivePackageOptions.length > 0;
  }, [selectedService, giftCardsEnabled, onlinePaymentEnabled, paymentRequired, effectivePackageOptions, isRecurring]);

  // ─── Step Configuration ──────────────────────────────────────────────────

  // Build step sequence dynamically
  const stepConfig = useMemo(() => {
    const steps: Array<{ key: string; label: string }> = [
      { key: "service", label: "Service" },
      { key: "location", label: "Location" },
      { key: "datetime", label: "Date & Time" },
    ];

    if (recurringEnabled) {
      steps.push({ key: "recurrence", label: "Repeat" });
    }

    steps.push({ key: "customer", label: "Details" });

    if (showPaymentStep) {
      steps.push({ key: "payment", label: "Payment" });
    }

    steps.push({ key: "review", label: "Review" });

    return steps;
  }, [recurringEnabled, showPaymentStep]);

  const stepLabels = useMemo(() => stepConfig.map((s) => s.label), [stepConfig]);

  // Resolve step indices
  const getStepIndex = useCallback((key: string) => {
    return stepConfig.findIndex((s) => s.key === key);
  }, [stepConfig]);

  const recurrenceStepIndex = getStepIndex("recurrence");
  const customerStepIndex = getStepIndex("customer");
  const paymentStepIndex = getStepIndex("payment");
  const reviewStepIndex = getStepIndex("review");

  // ─── State Reset Rules ───────────────────────────────────────────────────

  const handleServiceSelect = useCallback((service: PublicBookableService) => {
    setSelectedService(service);
    setSelectedLocationId(null);
    setSelectedResourceId(null);
    setSelectedDate(null);
    setSelectedOption(null);
    setSelectedResourceForSlot(null);
    setRecurrenceSelection(null);
    setPaymentMethod("pay_at_business");
    setGiftCardReservation(null);
    setSelectedPackageOption(null);
    setStep(1);
  }, []);

  const handleLocationSelect = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedResourceId(null);
    setSelectedDate(null);
    setSelectedOption(null);
    setSelectedResourceForSlot(null);
    setRecurrenceSelection(null);
    setStep(2);
  }, []);

  const handleDateTimeSelect = useCallback((option: PublicAvailabilityOption, resourceId: string) => {
    setSelectedOption(option);
    setSelectedResourceForSlot(resourceId);
    // Next step: recurrence (if enabled) or customer details
    if (recurringEnabled) {
      setStep(getStepIndex("recurrence"));
    } else {
      setStep(getStepIndex("customer"));
    }
  }, [recurringEnabled, getStepIndex]);

  const handleRecurrenceSelect = useCallback((selection: PublicRecurrenceSelection) => {
    setRecurrenceSelection(selection);
    // If recurring, force pay_at_business and clear gift card/package
    if (selection.enabled) {
      setPaymentMethod("pay_at_business");
      setGiftCardReservation(null);
      setSelectedPackageOption(null);
    }
    setStep(getStepIndex("customer"));
  }, [getStepIndex]);

  const handleCustomerSubmit = useCallback(() => {
    const nextKey = showPaymentStep ? "payment" : "review";
    setStep(getStepIndex(nextKey));
  }, [showPaymentStep, getStepIndex]);

  const handlePaymentSelect = useCallback((
    method: PaymentMethod,
    giftCard?: GiftCardReservation,
    packageOption?: PackageOption
  ) => {
    setPaymentMethod(method);
    setGiftCardReservation(giftCard ?? null);
    setSelectedPackageOption(packageOption ?? null);
    setStep(getStepIndex("review"));
  }, [getStepIndex]);

  const handleConfirmation = useCallback((conf: PublicBookingConfirmation) => {
    setConfirmation(conf);
    setStep(stepConfig.length); // Beyond last step = confirmation
  }, [stepConfig.length]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  // Progress
  const totalSteps = stepLabels.length;

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
      {/* Service */}
      {step === 0 && (
        <PublicServiceStep
          services={services}
          showPrices={settings.showServicePrices}
          showDuration={settings.showServiceDuration}
          onSelect={handleServiceSelect}
        />
      )}

      {/* Location */}
      {step === 1 && selectedService && (
        <PublicLocationStep
          tenantSlug={tenantSlug}
          tenantId={tenant.id}
          serviceId={selectedService.id}
          onSelect={handleLocationSelect}
          onBack={handleBack}
        />
      )}

      {/* Date & Time */}
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

      {/* Recurrence */}
      {step === recurrenceStepIndex && selectedOption && selectedService && (
        <PublicRecurrenceStep
          selectedDate={selectedOption.startsAt.slice(0, 10)}
          selectedTime={selectedOption.localStartTime}
          timeZone={timeZone}
          durationMinutes={selectedService.durationMinutes}
          onSelect={handleRecurrenceSelect}
          onBack={handleBack}
        />
      )}

      {/* Customer Details */}
      {step === customerStepIndex && (
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

      {/* Payment (conditional — not shown for recurring) */}
      {step === paymentStepIndex && paymentStepIndex >= 0 && selectedService && (
        <PublicPaymentStep
          tenantSlug={tenantSlug}
          servicePrice={Math.round(parseFloat(selectedService.price) * 100)}
          serviceCurrency={selectedService.currency}
          giftCardsEnabled={giftCardsEnabled}
          onlinePaymentEnabled={onlinePaymentEnabled}
          paymentRequired={paymentRequired}
          packageOptions={effectivePackageOptions}
          onSelect={handlePaymentSelect}
          onBack={handleBack}
        />
      )}

      {/* Review */}
      {step === reviewStepIndex && selectedService && selectedOption && selectedResourceForSlot && (
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
          paymentMethod={(isRecurring ? "pay_at_business" : paymentMethod) as PublicPaymentMethod}
          giftCardReservation={isRecurring ? null : giftCardReservation}
          packageOption={isRecurring ? null : selectedPackageOption}
          recurrence={recurrenceSelection}
          onConfirm={handleConfirmation}
          onBack={handleBack}
        />
      )}
    </PublicBookingShell>
  );
}
