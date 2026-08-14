import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "@/features/platform/services/polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "@/features/platform/services/polar-config";
import { logger } from "@/lib/logging";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Polar Discount Webhook — handles discount.created, discount.updated, discount.deleted events.
 *
 * Syncs Polar discount state back to local tenant_discounts:
 * - discount.created: If metadata contains our tenant_id + local_resource_id, mark as synced
 * - discount.updated: Update local discount fields (name, amount, dates, active state)
 * - discount.deleted: Deactivate the local discount (soft delete)
 *
 * Architecture:
 * - Local-first: tenant_discounts is the source of truth, synced to Polar
 * - This webhook handles reverse-sync when Polar state changes externally
 * - Uses payment_provider_resources mapping to link Polar ID ↔ local discount ID
 */
export async function POST(request: NextRequest) {
  const { payload, error } = await parseAndVerify(request);
  if (error) return error;

  const event = payload as Record<string, unknown>;
  const eventType = String(event.type ?? event.event ?? "");
  const data = event.data as Record<string, unknown> | undefined;

  logger.info("polar_webhook_discount", { operation: "webhook.discount", eventType });

  if (!data) {
    return NextResponse.json({ received: true, handler: "discount_no_data" }, { status: 200 });
  }

  const polarDiscountId = String(data.id ?? "");
  if (!polarDiscountId) {
    return NextResponse.json({ received: true, handler: "discount_no_id" }, { status: 200 });
  }

  try {
    const supabase = createAdminClient();

    // Find local mapping by provider_resource_id
    const { data: mapping } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("payment_provider_resources" as never)
      .select("id, tenant_id, local_resource_id, sync_status" as never)
      .eq("resource_type" as never, "discount")
      .eq("provider_resource_id" as never, polarDiscountId)
      .maybeSingle();

    if (!mapping) {
      // No local mapping — might be a discount created directly in Polar (not from us)
      // Check metadata for our tenant info
      const metadata = data.metadata as Record<string, unknown> | undefined;
      if (metadata?.source === "get-slot" && metadata?.tenant_id && metadata?.local_resource_id) {
        // This is ours but mapping doesn't exist yet — create it
        await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("payment_provider_resources" as never)
          .insert({
            tenant_id: metadata.tenant_id,
            resource_type: "discount",
            local_resource_id: metadata.local_resource_id,
            provider_resource_id: polarDiscountId,
            sync_status: "synced",
            sync_version: 1,
          } as never);

        logger.info("polar_discount_mapping_created", { operation: "webhook.discount" });
      }

      return NextResponse.json({ received: true, handler: "discount_no_mapping" }, { status: 200 });
    }

    const mappingRow = mapping as unknown as {
      id: string;
      tenant_id: string;
      local_resource_id: string;
      sync_status: string;
    };

    // Handle event types
    switch (eventType) {
      case "discount.created":
      case "discount.updated": {
        // Sync Polar state back to local discount
        const updates: Record<string, unknown> = {};

        if (data.name) updates.name = String(data.name);

        // Handle active/deleted state
        if (data.is_active === false || data.deleted_at) {
          updates.is_active = false;
        } else if (data.is_active === true) {
          updates.is_active = true;
        }

        // Sync amount changes
        if (data.type === "percentage" && typeof data.basis_points === "number") {
          updates.discount_type = "percentage";
          updates.percentage = (data.basis_points as number) / 100;
        } else if (data.type === "fixed" && typeof data.amount === "number") {
          updates.discount_type = "fixed";
          updates.fixed_amount = data.amount;
          if (data.currency) updates.currency = String(data.currency).toUpperCase();
        }

        // Sync dates
        if (data.starts_at !== undefined) updates.starts_at = data.starts_at ?? null;
        if (data.ends_at !== undefined) updates.ends_at = data.ends_at ?? null;
        if (data.max_redemptions !== undefined) updates.maximum_redemptions = data.max_redemptions ?? null;

        if (Object.keys(updates).length > 0) {
          await (supabase as never as ReturnType<typeof createAdminClient>)
            .from("tenant_discounts" as never)
            .update(updates as never)
            .eq("id" as never, mappingRow.local_resource_id)
            .eq("tenant_id" as never, mappingRow.tenant_id);
        }

        // Update sync status
        await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("payment_provider_resources" as never)
          .update({ sync_status: "synced", last_synced_at: new Date().toISOString() } as never)
          .eq("id" as never, mappingRow.id);

        logger.info("polar_discount_synced_back", { operation: "webhook.discount", eventType });
        return NextResponse.json({ received: true, handler: "discount_updated" }, { status: 200 });
      }

      case "discount.deleted": {
        // Soft-delete: deactivate local discount
        await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("tenant_discounts" as never)
          .update({ is_active: false } as never)
          .eq("id" as never, mappingRow.local_resource_id)
          .eq("tenant_id" as never, mappingRow.tenant_id);

        // Mark mapping as deleted
        await (supabase as never as ReturnType<typeof createAdminClient>)
          .from("payment_provider_resources" as never)
          .update({ sync_status: "deleted" } as never)
          .eq("id" as never, mappingRow.id);

        logger.info("polar_discount_deleted", { operation: "webhook.discount" });
        return NextResponse.json({ received: true, handler: "discount_deleted" }, { status: 200 });
      }

      default:
        return NextResponse.json({ received: true, handler: "discount_unknown_event" }, { status: 200 });
    }
  } catch (err) {
    logger.error("polar_webhook_discount_error", { operation: "webhook.discount" }, err instanceof Error ? err : new Error(String(err)));
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
  const secret = getPolarWebhookSecret("DISCOUNT");

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody), error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
