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
  const sig = request.headers.get("svix-signature") ?? request.headers.get("polar-signature") ?? request.headers.get("x-polar-signature");
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const secret = getPolarWebhookSecret(webhookType);

  if (!verifyPolarWebhookSignature({ rawBody, signatureHeader: sig, secret, svixId, svixTimestamp })) {
    console.error("[polar-webhook] Signature verification failed", {
      webhookType,
      hasSig: Boolean(sig),
      sigPrefix: sig?.slice(0, 20),
      hasSvixId: Boolean(svixId),
      hasSvixTimestamp: Boolean(svixTimestamp),
      secretPrefix: secret ? `${secret.slice(0, 10)}...` : "EMPTY",
      secretLength: secret?.length ?? 0,
      bodyLength: rawBody.length,
    });
    return { payload: null, error: NextResponse.json({ error: "Invalid signature" }, { status: 401 }) };
  }

  try {
    return { payload: JSON.parse(rawBody) as Record<string, unknown>, error: null };
  } catch {
    return { payload: null, error: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}
