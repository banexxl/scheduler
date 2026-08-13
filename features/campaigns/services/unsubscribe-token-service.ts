import "server-only";

/**
 * Marketing Unsubscribe Token Service — Milestone 15.7.
 *
 * Generates and validates secure unsubscribe tokens following the same
 * pattern as review tokens (32-byte random + SHA-256 hash).
 *
 * Security properties:
 * - Unguessable (32 bytes of randomness)
 * - Purpose-scoped (marketing_unsubscribe only)
 * - Tenant-scoped + customer-scoped
 * - Idempotent (multiple unsubscribes are safe)
 * - Hashed storage (raw token never persisted)
 * - 1-year TTL (generous — unsubscribe should work even if delayed)
 */

import { randomBytes, createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";

// ─── Token Generation ────────────────────────────────────────────────────────

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function getTokenPrefix(rawToken: string): string {
  return rawToken.slice(0, 10);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a new unsubscribe token for a customer.
 * Returns the raw token (to embed in email links).
 * Stores only the hash in the database.
 */
export async function createUnsubscribeToken(
  tenantId: string,
  customerId: string
): Promise<string> {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = getTokenPrefix(rawToken);

  const supabase = createServiceRoleClient();
  await supabase
    .from("marketing_unsubscribe_tokens" as never)
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      purpose: "marketing_unsubscribe",
    } as never);

  return rawToken;
}

/**
 * Validates an unsubscribe token and processes the unsubscribe.
 * Idempotent — calling multiple times is safe.
 *
 * Returns: { success, tenantId, customerId } or { success: false, reason }
 */
export async function processUnsubscribeToken(
  rawToken: string
): Promise<
  | { success: true; tenantId: string; customerId: string }
  | { success: false; reason: string }
> {
  if (!rawToken || rawToken.length < 20) {
    return { success: false, reason: "invalid_token" };
  }

  const tokenHash = hashToken(rawToken);
  const supabase = createServiceRoleClient();

  // Find token
  const { data: tokenRow } = await supabase
    .from("marketing_unsubscribe_tokens" as never)
    .select("id, tenant_id, customer_id, is_used, expires_at" as never)
    .eq("token_hash" as never, tokenHash)
    .single();

  if (!tokenRow) {
    return { success: false, reason: "token_not_found" };
  }

  const token = tokenRow as unknown as {
    id: string;
    tenant_id: string;
    customer_id: string;
    is_used: boolean;
    expires_at: string;
  };

  // Check expiration
  if (new Date(token.expires_at) < new Date()) {
    return { success: false, reason: "token_expired" };
  }

  // Already used — idempotent success
  if (token.is_used) {
    return { success: true, tenantId: token.tenant_id, customerId: token.customer_id };
  }

  // Mark token as used
  await supabase
    .from("marketing_unsubscribe_tokens" as never)
    .update({ is_used: true, used_at: new Date().toISOString() } as never)
    .eq("id" as never, token.id);

  // Update customer's marketing opt-in to false
  await supabase
    .from("tenant_customers")
    .update({ marketing_opt_in: false })
    .eq("id", token.customer_id)
    .eq("tenant_id", token.tenant_id);

  return { success: true, tenantId: token.tenant_id, customerId: token.customer_id };
}

/**
 * Gets or creates an unsubscribe token for a customer.
 * If a valid unexpired token already exists, returns it.
 * Otherwise creates a new one.
 *
 * Note: We always create a new token for each campaign email
 * to simplify implementation. Old tokens remain valid.
 */
export async function getOrCreateUnsubscribeToken(
  tenantId: string,
  customerId: string
): Promise<string> {
  return createUnsubscribeToken(tenantId, customerId);
}
