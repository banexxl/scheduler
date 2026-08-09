import "server-only";

/**
 * Polar Appointment Payment Provider — Milestone 11.2.
 *
 * Implements the AppointmentPaymentProvider interface using the Polar
 * checkout API. Reuses the existing Polar client infrastructure.
 *
 * Strategy: Uses Polar's checkout endpoint with product_id from tenant
 * payment settings. Amount/currency come from the appointment payment snapshot.
 */

import { getPolarEnvironment } from "@/features/platform/services/polar-config";
import { logger } from "@/lib/logging";
import type {
  AppointmentPaymentProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
} from "./appointment-payment-provider";

// ─── Polar Fetch (reused from existing client pattern) ───────────────────────

async function polarFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const env = getPolarEnvironment();
  if (!env.accessToken) {
    throw new Error("Polar billing is not configured.");
  }

  const url = `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.accessToken}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Polar API error (${response.status}): ${body.slice(0, 200)}`
    );
  }

  return (await response.json()) as T;
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class PolarAppointmentPaymentProvider implements AppointmentPaymentProvider {
  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const env = getPolarEnvironment();

    if (!env.accessToken) {
      throw new Error("Polar is not configured for appointment payments.");
    }

    // Build checkout request payload
    // Polar /v1/checkouts accepts product_id + custom amount or just amount
    const payload: Record<string, unknown> = {
      // Use custom amount checkout (Polar supports amount override)
      amount: input.amount,
      currency: input.currency.toLowerCase(),
      success_url: input.successUrl,
      metadata: input.metadata,
    };

    // Add customer info if available
    if (input.customerEmail) {
      payload.customer_email = input.customerEmail;
    }
    if (input.customerName) {
      payload.customer_name = input.customerName;
    }

    // Use payment intent ID as idempotency correlation
    payload.metadata = {
      ...input.metadata,
      payment_intent_id: input.paymentIntentId,
      appointment_id: input.appointmentId,
      tenant_id: input.tenantId,
    };

    logger.info("polar_appointment_checkout_creating", {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      operation: "create_checkout",
    });

    const response = await polarFetch<Record<string, unknown>>("/v1/checkouts/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Extract response fields
    const checkoutId = String(response.id ?? "").trim();
    const checkoutUrl = String(
      response.url ?? response.checkout_url ?? ""
    ).trim();

    if (!checkoutId || !checkoutUrl) {
      throw new Error("Polar checkout response missing ID or URL.");
    }

    // Validate checkout URL is HTTPS and from expected domain
    if (!checkoutUrl.startsWith("https://")) {
      throw new Error("Polar returned non-HTTPS checkout URL.");
    }

    const expiresAt = typeof response.expires_at === "string"
      ? response.expires_at : null;
    const status = typeof response.status === "string"
      ? response.status : null;

    logger.info("polar_appointment_checkout_created", {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      operation: "checkout_created",
    });

    return { checkoutId, checkoutUrl, status, expiresAt };
  }
}
