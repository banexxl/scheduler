export type PolarSubscriptionStatus =
     | "incomplete"
     | "incomplete_expired"
     | "trialing"
     | "active"
     | "past_due"
     | "canceled"
     | "unpaid"
     | "unknown";

export type SubscriptionAccessState =
     | "pending"
     | "trial"
     | "active"
     | "grace_period"
     | "ending"
     | "revoked";

export const KNOWN_POLAR_SUBSCRIPTION_STATUSES: PolarSubscriptionStatus[] = [
     "incomplete",
     "incomplete_expired",
     "trialing",
     "active",
     "past_due",
     "canceled",
     "unpaid",
     "unknown",
];
