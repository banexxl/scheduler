export type BillingState = "free" | "trial" | "active" | "grace_period" | "restricted";

export type TenantEntitlementPlan = {
     maxLocations: number | null;
     maxResources: number | null;
     maxServices: number | null;
     maxTeamMembers: number | null;
     publicBookingEnabled: boolean;
     emailNotificationsEnabled: boolean;
     appointmentRemindersEnabled: boolean;
     customerSelfServiceEnabled: boolean;
};

export type PlanLimitCheckResult =
     | { success: true }
     | { success: false; code: "PLAN_LIMIT_REACHED"; limit: number; current: number; resource: string };

export type BillingSubscriptionSnapshot = {
     accessState?: string | null;
     status?: string | null;
     billingPlanId?: string | null;
     planKey?: string | null;
     billingPlanName?: string | null;
     billingInterval?: string | null;
     billingIntervalCount?: number | null;
     amount?: number | null;
     currency?: string | null;
     trialStart?: string | null;
     trialEnd?: string | null;
     currentPeriodEnd?: string | null;
     cancelAtPeriodEnd?: boolean | null;
     currentPeriodStart?: string | null;
};

export function resolveBillingState(subscription: Pick<BillingSubscriptionSnapshot, "accessState" | "status">): BillingState {
     const accessState = String(subscription.accessState ?? "").toLowerCase();
     const status = String(subscription.status ?? "").toLowerCase();

     if (accessState === "trial" || status === "trialing") return "trial";
     if (accessState === "active" || status === "active") return "active";
     if (accessState === "grace_period" || status === "past_due") return "grace_period";
     if (accessState === "pending" || accessState === "ending" || accessState === "revoked") return "restricted";
     return "free";
}

export function hasFeature(feature: string, entitlements: Partial<TenantEntitlementPlan>): boolean {
     switch (feature) {
          case "public_booking":
               return Boolean(entitlements.publicBookingEnabled);
          case "email_notifications":
               return Boolean(entitlements.emailNotificationsEnabled);
          case "appointment_reminders":
               return Boolean(entitlements.appointmentRemindersEnabled);
          case "customer_self_service":
               return Boolean(entitlements.customerSelfServiceEnabled);
          default:
               return false;
     }
}

export function getPlanLimit(entitlements: Partial<TenantEntitlementPlan>, key: keyof Pick<TenantEntitlementPlan, "maxLocations" | "maxResources" | "maxServices" | "maxTeamMembers">): number | null {
     return entitlements[key] ?? null;
}

export function assertWithinLimit({
     currentUsage,
     planLimit,
     resource,
}: {
     currentUsage: number;
     planLimit: number | null;
     resource: string;
}): PlanLimitCheckResult {
     if (planLimit === null || currentUsage < planLimit) {
          return { success: true };
     }

     return {
          success: false,
          code: "PLAN_LIMIT_REACHED",
          limit: planLimit,
          current: currentUsage,
          resource,
     };
}
