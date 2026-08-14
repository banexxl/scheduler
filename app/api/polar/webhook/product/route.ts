import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "@/features/platform/services/polar-config";
import { logger } from "@/lib/logging";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Polar Product Webhook — handles product.created, product.updated events.
 *
 * Syncs Polar product state back to local billing_plans + billing_plan_prices.
 * This is the reverse-sync path: when a product is modified in Polar dashboard,
 * the local plan reflects those changes.
 *
 * Fields synced:
 * - name → polar_product_name
 * - description → polar_product_description
 * - is_archived → is_active (inverted)
 * - modified_at → polar_modified_at
 * - prices → billing_plan_prices (upsert by polar_price_id)
 *
 * Revalidates /platform/billing/plans and /platform/billing/products cache.
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parseAndVerify(request);
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");
  const data = event.data as Record<string, unknown> | undefined;

  logger.info("polar_webhook_product", { operation: "webhook.product", eventType });

  if (!data) {
    return NextResponse.json({ received: true, handler: "product_no_data" }, { status: 200 });
  }

  const polarProductId = String(data.id ?? "");
  if (!polarProductId) {
    return NextResponse.json({ received: true, handler: "product_no_id" }, { status: 200 });
  }

  try {
    const supabase = createAdminClient();

    // Find local billing plan by polar_product_id
    const { data: plan } = await supabase
      .from("billing_plans" as never)
      .select("id, plan_key" as never)
      .eq("polar_product_id" as never, polarProductId)
      .maybeSingle();

    if (!plan) {
      // No local plan mapped to this product — acknowledge but skip
      logger.info("polar_webhook_product_unmapped", { operation: "webhook.product", polarProductId });
      return NextResponse.json({ received: true, handler: "product_unmapped" }, { status: 200 });
    }

    const planRow = plan as unknown as { id: string; plan_key: string };

    // Sync product fields to billing plan
    const updates: Record<string, unknown> = {
      polar_product_name: data.name ?? null,
      polar_product_description: data.description ?? null,
      polar_modified_at: data.modified_at ?? new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    // is_archived in Polar = plan should be deactivated
    if (data.is_archived === true) {
      updates.is_active = false;
    }

    // Optionally sync name back to plan name (if admin wants Polar as source)
    if (data.name && typeof data.name === "string") {
      updates.name = data.name;
    }
    if (data.description !== undefined) {
      updates.description = (typeof data.description === "string" ? data.description : null);
    }

    await supabase
      .from("billing_plans" as never)
      .update(updates as never)
      .eq("id" as never, planRow.id);

    // Sync prices
    const prices = (data.prices ?? []) as Array<Record<string, unknown>>;
    for (const price of prices) {
      const priceId = String(price.id ?? "");
      if (!priceId) continue;

      const priceData: Record<string, unknown> = {
        billing_plan_id: planRow.id,
        polar_product_id: polarProductId,
        polar_price_id: priceId,
        price_type: String(price.type ?? (data.is_recurring ? "recurring" : "one_time")),
        amount: typeof price.price_amount === "number" ? price.price_amount : null,
        currency: typeof price.price_currency === "string" ? price.price_currency : null,
        is_recurring: Boolean(data.is_recurring),
        is_archived: Boolean(price.is_archived),
        is_active: !Boolean(price.is_archived),
        is_checkout_eligible: !Boolean(price.is_archived),
        last_synced_at: new Date().toISOString(),
        polar_created_at: typeof price.created_at === "string" ? price.created_at : null,
        polar_modified_at: typeof price.modified_at === "string" ? price.modified_at : null,
      };

      // Determine billing interval from product-level data
      if (data.is_recurring) {
        // Polar uses recurring_interval on the price or product level
        const interval = price.recurring_interval ?? data.recurring_interval;
        if (interval === "month" || interval === "year") {
          priceData.billing_interval = interval;
          priceData.billing_interval_count = price.recurring_interval_count ?? data.recurring_interval_count ?? 1;
        }
      }

      // Upsert by polar_price_id
      await supabase
        .from("billing_plan_prices" as never)
        .upsert(priceData as never, { onConflict: "polar_price_id" });
    }

    // Revalidate billing pages
    revalidatePath("/platform/billing/plans");
    revalidatePath("/platform/billing/products");

    logger.info("polar_webhook_product_synced", {
      operation: "webhook.product",
      planId: planRow.id,
      planKey: planRow.plan_key,
      pricesSynced: prices.length,
    });

    return NextResponse.json({ received: true, handler: "product_synced", planId: planRow.id }, { status: 200 });
  } catch (err) {
    logger.error("polar_webhook_product_error", { operation: "webhook.product" }, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function parseAndVerify(request: NextRequest) {
  let environment;
  try {
    environment = getPolarEnvironment();
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Not configured" }, { status: 503 }) };
  }

  const rawBody = await request.text();
  const sig = request.headers.get("polar-signature") ?? request.headers.get("x-polar-signature") ?? request.headers.get("svix-signature");
  const secret = getPolarWebhookSecret("PRODUCT");

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody), error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
