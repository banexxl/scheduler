import type { OnboardingProgress, OnboardingStepKey } from "../types/onboarding";

type ResolveInput = {
     currentStep?: string | null;
     status?: string | null;
     tenant: { name?: string | null; defaultTimezone?: string | null; defaultCurrency?: string | null };
     locations: Array<{ id?: string | null }>;
     resources: Array<{ id?: string | null }>;
     services: Array<{ id?: string | null }>;
     locationHours: Array<{ id?: string | null }>;
     resourceHours: Array<{ id?: string | null }>;
     bookingRules: { minimumNoticeMinutes?: number | null } | null;
     publicBookingSettings: { isEnabled?: boolean | null } | null;
     plan: { canUsePublicBooking?: boolean | null };
};

const REQUIRED_STEPS: OnboardingStepKey[] = [
     "business_details",
     "location",
     "resource",
     "service",
     "working_hours",
     "booking_rules",
];

const OPTIONAL_STEPS: OnboardingStepKey[] = ["public_booking"];

function normalizeStep(value?: string | null): OnboardingStepKey {
     if (value === "business_details" || value === "location" || value === "resource" || value === "service" || value === "working_hours" || value === "booking_rules" || value === "public_booking" || value === "complete") {
          return value;
     }
     return "business_details";
}

export function resolveOnboardingProgress(input: ResolveInput): OnboardingProgress {
     const businessComplete = Boolean(input.tenant.name?.trim() && input.tenant.defaultTimezone?.trim() && input.tenant.defaultCurrency?.trim());
     const locationComplete = (input.locations?.length ?? 0) > 0;
     const resourceComplete = (input.resources?.length ?? 0) > 0;
     const serviceComplete = (input.services?.length ?? 0) > 0;
     const workingHoursComplete = (input.locationHours?.length ?? 0) > 0 || (input.resourceHours?.length ?? 0) > 0;
     const bookingRulesComplete = Boolean(input.bookingRules && (input.bookingRules.minimumNoticeMinutes ?? 0) > 0);
     const publicBookingComplete = Boolean(input.publicBookingSettings?.isEnabled);
     const canUsePublicBooking = Boolean(input.plan?.canUsePublicBooking);

     const completedSteps: OnboardingStepKey[] = [];
     if (businessComplete) completedSteps.push("business_details");
     if (locationComplete) completedSteps.push("location");
     if (resourceComplete) completedSteps.push("resource");
     if (serviceComplete) completedSteps.push("service");
     if (workingHoursComplete) completedSteps.push("working_hours");
     if (bookingRulesComplete) completedSteps.push("booking_rules");
     if (canUsePublicBooking && publicBookingComplete) completedSteps.push("public_booking");

     const remainingRequired = REQUIRED_STEPS.filter((step) => !completedSteps.includes(step));
     const remainingOptional = OPTIONAL_STEPS.filter((step) => !completedSteps.includes(step));
     const remainingSteps = [...remainingRequired, ...(canUsePublicBooking ? remainingOptional : [])];

     const isCompleted = remainingRequired.length === 0 && (!canUsePublicBooking || remainingOptional.length === 0);
     const percentComplete = Math.round((completedSteps.length / (REQUIRED_STEPS.length + (canUsePublicBooking ? OPTIONAL_STEPS.length : 0))) * 100);
     const currentStep = normalizeStep(input.currentStep);

     const effectiveCurrentStep = (() => {
          if (isCompleted) return "complete";
          if (currentStep && currentStep !== "complete" && completedSteps.includes(currentStep)) {
               return remainingSteps[0] ?? "complete";
          }
          return remainingSteps[0] ?? "complete";
     })() as OnboardingStepKey;

     return {
          status: isCompleted ? "completed" : input.status === "completed" ? "completed" : (input.status === "not_started" ? "not_started" : "in_progress"),
          currentStep: effectiveCurrentStep,
          completedSteps,
          remainingSteps,
          percentComplete: Number.isFinite(percentComplete) ? percentComplete : 0,
          canComplete: isCompleted,
     };
}
