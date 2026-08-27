export type OnboardingStatus = "not_started" | "in_progress" | "completed";

export type OnboardingStepKey =
     | "business_details"
     | "location"
     | "resource"
     | "service"
     | "working_hours"
     | "booking_rules"
     | "public_booking"
     | "complete";

export type OnboardingProgress = {
     status: OnboardingStatus;
     currentStep: OnboardingStepKey;
     completedSteps: OnboardingStepKey[];
     remainingSteps: OnboardingStepKey[];
     percentComplete: number;
     canComplete: boolean;
};

export type OnboardingPageData = {
     tenant: {
          id: string;
          slug: string;
          name: string;
          timezone: string;
     };
     progress: OnboardingProgress;
     billing: {
          planKey: string;
          canUsePublicBooking: boolean;
     };
     summary: {
          locationCount: number;
          resourceCount: number;
          serviceCount: number;
          hasLocationHours: boolean;
          hasResourceHours: boolean;
          hasBookingRules: boolean;
          hasPublicBookingSettings: boolean;
     };
};
