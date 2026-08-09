import "server-only";

/**
 * Create Package Purchase — Milestone 11.6.
 *
 * Creates a Polar checkout for a package purchase.
 * Package is NOT granted until trusted order.paid webhook.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger, generateOperationId } from "@/lib/logging";
import { PolarAppointmentPaymentProvider } from "../providers/polar-appointment-payment-provider";
import type { CreatePackagePurchaseInput, CreatePackagePurchaseResult } from "../types/package-purchase";

export async function createPackagePurchase(
  input: CreatePackagePurchaseInput
): Promise<CreatePackagePurchaseResult> {
  const operationId = generateOperationId();
  const supabase = createAdminClient();

  // 1. Load package (verify active, public, priced, belongs to tenant)
  const { data: pkgRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("service_packages" as never)
    .select("id, tenant_id, name, total_credits, validity_days, is_active, is_public, price_amount, price_currency" as never)
    .eq("id" as never, input.packageId)
    .eq("tenant_id" as never, input.tenantId)
    .single();

  if (!pkgRow) {
    return { success: false, error: "Package not found.", code: "NOT_FOUND" };
  }

  const pkg = pkgRow as unknown as {
    id: string; name: string; total_credits: number; validity_days: number | null;
    is_active: boolean; is_public: boolean; price_amount: number | null; price_currency: string | null;
  };

  if (!pkg.is_active) {
    return { success: false, error: "Package is not available.", code: "INACTIVE" };
  }

  if (!pkg.is_public) {
    return { success: false, error: "Package is not available for purchase.", code: "NOT_PUBLIC" };
  }

  if (!pkg.price_amount || !pkg.price_currency) {
    return { success: false, error: "Package does not have online pricing.", code: "NO_PRICE" };
  }

  // 2. Generate request key for idempotency
  const requestKey = `package:${input.packageId}:customer:${input.tenantCustomerId}:${crypto.randomUUID()}`;

  // 3. Create local purchase row
  const { data: purchaseRow, error: insertError } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("package_purchases" as never)
    .insert({
      tenant_id: input.tenantId,
      package_id: input.packageId,
      tenant_customer_id: input.tenantCustomerId,
      status: "creating",
      package_name_snapshot: pkg.name,
      credits_snapshot: pkg.total_credits,
      validity_days_snapshot: pkg.validity_days,
      amount_total: pkg.price_amount,
      currency: pkg.price_currency,
      request_key: requestKey,
    } as never)
    .select("id")
    .single();

  if (insertError || !purchaseRow) {
    return { success: false, error: "Failed to create purchase.", code: "INSERT_FAILED" };
  }

  const purchaseId = (purchaseRow as unknown as { id: string }).id;

  // 4. Build success URL
  const appUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const successUrl = `${appUrl}/book/${input.tenantSlug}/packages/payment/return?ref=${purchaseId}`;

  // 5. Call Polar
  const provider = new PolarAppointmentPaymentProvider();

  try {
    const checkout = await provider.createCheckout({
      paymentIntentId: purchaseId,
      tenantId: input.tenantId,
      appointmentId: input.packageId, // reuse field for correlation
      amount: pkg.price_amount,
      currency: pkg.price_currency,
      description: `Package: ${pkg.name}`,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      successUrl,
      metadata: {
        domain: "package_purchase",
        package_purchase_id: purchaseId,
        tenant_id: input.tenantId,
        package_id: input.packageId,
        tenant_customer_id: input.tenantCustomerId,
      },
    });

    // 6. Update purchase with checkout info
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("package_purchases" as never)
      .update({
        status: "pending",
        provider: "polar",
        provider_checkout_id: checkout.checkoutId,
        checkout_url: checkout.checkoutUrl,
      } as never)
      .eq("id" as never, purchaseId);

    logger.info("package_purchase_checkout_created", {
      tenantId: input.tenantId,
      operation: "package_checkout",
      requestId: operationId,
    });

    return { success: true, purchaseId, checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("package_purchases" as never)
      .update({ status: "failed" } as never)
      .eq("id" as never, purchaseId);

    logger.error("package_purchase_checkout_failed", {
      tenantId: input.tenantId,
      requestId: operationId,
      errorCategory: "EXTERNAL_PROVIDER",
    }, error);

    return { success: false, error: "Unable to start payment. Please try again.", code: "PROVIDER_FAILED" };
  }
}
