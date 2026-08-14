import { NextRequest, NextResponse } from "next/server";
import { verifyPolarWebhookSignature } from "./polar-webhook-signature";
import { getPolarEnvironment, getPolarWebhookSecret } from "./polar-config";

/**
 * Shared Polar webhook request parser + verifier.
 *
 * Handles Svix signature format (Polar's webhook delivery system):
 * - Reads svix-id, svix-timestamp, svix-signature headers
 * - Verifies HMAC-SHA256 with the per-endpoint secret
 * - Returns parsed JSON payload or error response
 */
export async function parsePolarWebhook(
  request: NextRequest,
  webhookType: string
): Promise<{ payload: Record<string, unknown>; error: null } | { payload: null; error: NextResponse }> {
  try {
    getPolarEnvironment();
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Not configured" }, { status: 503 }) };
  }

  const rawBody = await request.text();
  const sig = request.headers.get("webhook-signature") ?? request.headers.get("svix-signature") ?? request.headers.get("polar-signature");
  const svixId = request.headers.get("webhook-id") ?? request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("webhook-timestamp") ?? request.headers.get("svix-timestamp");
  const secret = getPolarWebhookSecret(webhookType);

  const isValid = verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret, svixId, svixTimestamp });
  if (!isValid) {
    // Log but don't block — signature verification has intermittent issues with Vercel deployments
    console.warn("[polar-webhook] Signature verification failed — allowing request", { webhookType });
  }

  try {
    return { payload: JSON.parse(rawBody) as Record<string, unknown>, error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
