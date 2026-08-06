import type {
     PolarSubscriptionStatus,
     SubscriptionAccessState,
} from "../types/subscription-access-state";

type ResolveInput = {
     polarStatus: string | null;
     cancelAtPeriodEnd: boolean;
     currentPeriodEnd?: string | null;
     trialStart?: string | null;
     trialEnd?: string | null;
     endsAt?: string | null;
     endedAt?: string | null;
     nowIso: string;
};

export type SubscriptionAccessResolution = {
     normalizedPolarStatus: PolarSubscriptionStatus;
     accessState: SubscriptionAccessState;
     reason: string;
     isUnknownStatus: boolean;
};

function toIso(value: string | null | undefined): string | null {
     if (!value) return null;
     const date = new Date(value);
     return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePolarStatus(raw: string | null): PolarSubscriptionStatus {
     const value = (raw ?? "").trim().toLowerCase();
     switch (value) {
          case "incomplete":
          case "incomplete_expired":
          case "trialing":
          case "active":
          case "past_due":
          case "canceled":
          case "unpaid":
               return value;
          default:
               return "unknown";
     }
}

export function resolveSubscriptionAccessState(
     input: ResolveInput
): SubscriptionAccessResolution {
     const status = normalizePolarStatus(input.polarStatus);
     const nowIso = toIso(input.nowIso) ?? new Date().toISOString();
     const now = new Date(nowIso).getTime();

     const periodEnd = toIso(input.currentPeriodEnd);
     const trialEnd = toIso(input.trialEnd);
     const endedAt = toIso(input.endedAt);
     const endsAt = toIso(input.endsAt);

     if (status === "incomplete") {
          return {
               normalizedPolarStatus: status,
               accessState: "pending",
               reason: "subscription_incomplete",
               isUnknownStatus: false,
          };
     }

     if (status === "incomplete_expired") {
          return {
               normalizedPolarStatus: status,
               accessState: "revoked",
               reason: "subscription_incomplete_expired",
               isUnknownStatus: false,
          };
     }

     if (status === "trialing") {
          if (input.cancelAtPeriodEnd) {
               return {
                    normalizedPolarStatus: status,
                    accessState: "ending",
                    reason: "trial_scheduled_to_end",
                    isUnknownStatus: false,
               };
          }

          return {
               normalizedPolarStatus: status,
               accessState: "trial",
               reason: trialEnd ? "trial_active" : "trial_active_no_end",
               isUnknownStatus: false,
          };
     }

     if (status === "active") {
          if (input.cancelAtPeriodEnd) {
               return {
                    normalizedPolarStatus: status,
                    accessState: "ending",
                    reason: "active_scheduled_to_end",
                    isUnknownStatus: false,
               };
          }

          return {
               normalizedPolarStatus: status,
               accessState: "active",
               reason: periodEnd ? "active_current_period" : "active_no_period",
               isUnknownStatus: false,
          };
     }

     if (status === "past_due") {
          return {
               normalizedPolarStatus: status,
               accessState: "grace_period",
               reason: "subscription_past_due",
               isUnknownStatus: false,
          };
     }

     if (status === "canceled") {
          const ended =
               (endedAt && new Date(endedAt).getTime() <= now) ||
               (endsAt && new Date(endsAt).getTime() <= now);

          return {
               normalizedPolarStatus: status,
               accessState: "revoked",
               reason: ended ? "subscription_ended" : "subscription_canceled",
               isUnknownStatus: false,
          };
     }

     if (status === "unpaid") {
          return {
               normalizedPolarStatus: status,
               accessState: "revoked",
               reason: "subscription_unpaid",
               isUnknownStatus: false,
          };
     }

     return {
          normalizedPolarStatus: "unknown",
          accessState: "revoked",
          reason: "unknown_status_conservative",
          isUnknownStatus: true,
     };
}
