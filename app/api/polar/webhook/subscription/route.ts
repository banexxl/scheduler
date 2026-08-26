import { NextRequest, NextResponse } from "next/server";
import { parsePolarWebhook } from "@/features/platform/services/polar-webhook-handler";
import { logger } from "@/lib/logging";
import { persistBillingWebhookEvent } from "@/features/platform/services/billing-webhook-events";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Polar Subscription Webhook — Milestone 15.14.
 *
 * Handles subscription lifecycle events and updates tenant_subscriptions.
 *
 * Events:
 * - subscription.created → upsert tenant_subscriptions
 * - subscription.updated → update status, period dates
 * - subscription.active → mark active
 * - subscription.canceled → mark canceled (still active until period end)
 * - subscription.revoked → mark expired (immediate access loss)
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parsePolarWebhook(request, "SUBSCRIPTION");
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");
  const data = event.data as Record<string, unknown> | undefined;

  logger.info("polar_webhook_subscription", { operation: "webhook.subscription", eventType });

  try {
    // Persist event for billing audit
    await persistBillingWebhookEvent({ payload: event, rawBody: JSON.stringify(event) });

    if (!data) {
      return NextResponse.json({ received: true, handler: "subscription_no_data" }, { status: 200 });
    }

    const polarSubscriptionId = String(data.id ?? "");
    const polarCustomerId = String(data.customer_id ?? "");
    const status = mapPolarStatus(String(data.status ?? ""));
    const currentPeriodEnd = data.current_period_end as string | null ?? null;
    const cancelAtPeriodEnd = Boolean(data.cancel_at_period_end ?? false);
    const polarProductId = String(data.product_id ?? "");
    const polarPriceId = String(data.price_id ?? data.recurring_price_id ?? "");

    if (!polarSubscriptionId) {
      return NextResponse.json({ received: true, handler: "subscription_no_id" }, { status: 200 });
    }

    const supabase = createAdminClient();

    // Find the tenant via billing customer
    let tenantId: string | null = null;

    if (polarCustomerId) {
      const { data: customerRow } = await supabase
        .from("tenant_billing_customers" as never)
        .select("tenant_id" as never)
        .eq("polar_customer_id" as never, polarCustomerId)
        .maybeSingle();

      tenantId = (customerRow as unknown as { tenant_id: string } | null)?.tenant_id ?? null;
    }

    // Try metadata for tenant_id if customer lookup failed
    if (!tenantId) {
      const metadata = data.metadata as Record<string, unknown> | undefined;
      if (metadata?.tenant_id && typeof metadata.tenant_id === "string") {
        tenantId = metadata.tenant_id;
      }
    }

    if (!tenantId) {
      logger.warn("polar_webhook_subscription_no_tenant", { operation: "webhook.subscription", polarSubscriptionId, polarCustomerId });
      return NextResponse.json({ received: true, handler: "subscription_no_tenant" }, { status: 200 });
    }

    // Upsert tenant_subscriptions
    const { error: upsertError } = await supabase
      .from("tenant_subscriptions" as never)
      .upsert({
        tenant_id: tenantId,
        polar_subscription_id: polarSubscriptionId,
        polar_customer_id: polarCustomerId,
        polar_product_id: polarProductId,
        polar_price_id: polarPriceId || null,
        status,
        current_period_ends_at: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        last_synced_at: new Date().toISOString(),
      } as never, { onConflict: "tenant_id" });

    if (upsertError) {
      logger.error("polar_webhook_subscription_upsert_error", { operation: "webhook.subscription" }, upsertError);
    }

    logger.info("polar_webhook_subscription_synced", {
      operation: "webhook.subscription",
      tenantId,
      status,
      eventType,
    });

    return NextResponse.json({ received: true, handler: "subscription_synced", tenantId }, { status: 200 });
  } catch (err) {
    logger.error("polar_webhook_subscription_error", { operation: "webhook.subscription" }, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

/**
 * Maps Polar subscription status to our internal status.
 */
function mapPolarStatus(polarStatus: string): string {
  switch (polarStatus) {
    case "active": return "active";
    case "trialing": return "trialing";
    case "past_due": return "past_due";
    case "canceled": return "canceled";
    case "unpaid": return "past_due";
    case "incomplete": return "past_due";
    case "incomplete_expired": return "expired";
    case "revoked": return "expired";
    default: return polarStatus || "none";
  }
}
