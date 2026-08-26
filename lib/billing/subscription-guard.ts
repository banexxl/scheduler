import "server-only";

/**
 * Subscription Access Guard — Milestone 15.14.
 *
 * Determines whether a tenant has active dashboard access based on:
 * 1. Active free trial (trial_ends_at > now)
 * 2. Active paid subscription (status: active, trialing, or past_due within grace)
 * 3. Platform admin override (always allowed)
 *
 * Does NOT make UI decisions — returns a normalized result.
 * The dashboard layout uses this to redirect or render.
 *
 * Data sources:
 * - tenants.trial_started_at / trial_ends_at / trial_used
 * - tenant_subscriptions.status / current_period_ends_at
 */

import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionAccess = "allowed" | "trial_expired" | "no_trial" | "no_subscription";

export type SubscriptionCheckResult = {
  access: SubscriptionAccess;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  subscriptionStatus: string | null;
  currentPeriodEndsAt: string | null;
  isPlatformAdmin: boolean;
};

// ─── Grace period for past_due (days) ────────────────────────────────────────

const PAST_DUE_GRACE_DAYS = 7;

// ─── Main Guard ──────────────────────────────────────────────────────────────

/**
 * Checks whether a tenant has active dashboard access.
 *
 * Priority:
 * 1. Platform admin → always allowed
 * 2. Active subscription (active/trialing/past_due within grace) → allowed
 * 3. Active trial (trial_ends_at > now) → allowed
 * 4. Trial expired → blocked
 * 5. No trial ever started → blocked
 */
export async function checkTenantAccess(
  tenantId: string,
  userId: string
): Promise<SubscriptionCheckResult> {
  const supabase = createServiceRoleClient();

  // 1. Check platform admin (always bypass)
  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (adminRow) {
    return {
      access: "allowed",
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: null,
      currentPeriodEndsAt: null,
      isPlatformAdmin: true,
    };
  }

  // 2. Check active subscription
  const { data: subscription } = await supabase
    .from("tenant_subscriptions" as never)
    .select("status, current_period_ends_at, cancel_at_period_end" as never)
    .eq("tenant_id" as never, tenantId)
    .maybeSingle();

  const sub = subscription as unknown as {
    status: string;
    current_period_ends_at: string | null;
    cancel_at_period_end: boolean;
  } | null;

  if (sub) {
    const status = sub.status;

    // Active or trialing subscription → allowed
    if (status === "active" || status === "trialing") {
      return {
        access: "allowed",
        trialEndsAt: null,
        trialDaysRemaining: null,
        subscriptionStatus: status,
        currentPeriodEndsAt: sub.current_period_ends_at,
        isPlatformAdmin: false,
      };
    }

    // Past due — allow within grace period
    if (status === "past_due") {
      const periodEnd = sub.current_period_ends_at ? new Date(sub.current_period_ends_at) : null;
      const graceEnd = periodEnd ? new Date(periodEnd.getTime() + PAST_DUE_GRACE_DAYS * 86400000) : null;

      if (graceEnd && graceEnd > new Date()) {
        return {
          access: "allowed",
          trialEndsAt: null,
          trialDaysRemaining: null,
          subscriptionStatus: "past_due",
          currentPeriodEndsAt: sub.current_period_ends_at,
          isPlatformAdmin: false,
        };
      }
    }

    // Canceled but period hasn't ended yet → allowed
    if (status === "canceled" && sub.current_period_ends_at) {
      const periodEnd = new Date(sub.current_period_ends_at);
      if (periodEnd > new Date()) {
        return {
          access: "allowed",
          trialEndsAt: null,
          trialDaysRemaining: null,
          subscriptionStatus: "canceled",
          currentPeriodEndsAt: sub.current_period_ends_at,
          isPlatformAdmin: false,
        };
      }
    }
  }

  // 3. Check free trial
  const { data: tenant } = await supabase
    .from("tenants")
    .select("trial_started_at, trial_ends_at, trial_used")
    .eq("id", tenantId)
    .single();

  const tenantRow = tenant as unknown as {
    trial_started_at: string | null;
    trial_ends_at: string | null;
    trial_used: boolean;
  } | null;

  if (!tenantRow) {
    return {
      access: "no_trial",
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: sub?.status ?? null,
      currentPeriodEndsAt: null,
      isPlatformAdmin: false,
    };
  }

  // Never started a trial
  if (!tenantRow.trial_started_at || !tenantRow.trial_ends_at) {
    return {
      access: "no_trial",
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: sub?.status ?? null,
      currentPeriodEndsAt: null,
      isPlatformAdmin: false,
    };
  }

  // Trial still active
  const trialEnd = new Date(tenantRow.trial_ends_at);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000);

  if (trialEnd > now) {
    return {
      access: "allowed",
      trialEndsAt: tenantRow.trial_ends_at,
      trialDaysRemaining: daysRemaining,
      subscriptionStatus: sub?.status ?? "trialing",
      currentPeriodEndsAt: null,
      isPlatformAdmin: false,
    };
  }

  // Trial expired
  return {
    access: "trial_expired",
    trialEndsAt: tenantRow.trial_ends_at,
    trialDaysRemaining: 0,
    subscriptionStatus: sub?.status ?? "expired",
    currentPeriodEndsAt: null,
    isPlatformAdmin: false,
  };
}
