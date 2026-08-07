import "server-only";

/**
 * Customer Portal Token & Session Service — Milestone 8.6.
 *
 * Handles:
 * - Magic-link token generation (single-use, 15-min TTL)
 * - Token consumption → session creation (7-day TTL)
 * - Session validation and refresh
 * - Session revocation (logout)
 *
 * Reuses existing crypto patterns from appointment-token-crypto.
 * All operations use admin client (bypasses RLS).
 */

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 10;
const TOKEN_TTL_MINUTES = 15;
const SESSION_TTL_DAYS = 7;

// ─── Crypto Helpers ──────────────────────────────────────────────────────────

function generateSecureToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function getTokenPrefix(raw: string): string {
  return raw.slice(0, TOKEN_PREFIX_LENGTH);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PortalTokenCreateResult = {
  rawToken: string;
  tokenId: string;
  expiresAt: string;
};

export type PortalSessionCreateResult = {
  rawSessionToken: string;
  sessionId: string;
  expiresAt: string;
  tenantId: string;
  normalizedEmail: string;
  customerId: string | null;
};

export type PortalSessionContext = {
  sessionId: string;
  tenantId: string;
  normalizedEmail: string;
  customerId: string | null;
  expiresAt: string;
};

// ─── Create Access Token ─────────────────────────────────────────────────────

/**
 * Creates a single-use portal access token for a tenant+email.
 * Does NOT verify whether the email actually has appointments —
 * that check belongs to the caller (to prevent enumeration).
 */
export async function createPortalAccessToken(
  tenantId: string,
  email: string,
  customerId?: string | null
): Promise<PortalTokenCreateResult> {
  const normalizedEmail = normalizeEmail(email);
  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = getTokenPrefix(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();

  const supabase = createAdminClient();

  const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_access_tokens" as never)
    .insert({
      tenant_id: tenantId,
      customer_id: customerId ?? null,
      normalized_email: normalizedEmail,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      expires_at: expiresAt,
    } as never)
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new Error("Failed to create portal access token");
  }

  const row = data as unknown as { id: string; expires_at: string };

  return {
    rawToken,
    tokenId: row.id,
    expiresAt: row.expires_at,
  };
}

// ─── Consume Access Token ────────────────────────────────────────────────────

type ConsumeResult =
  | { success: true; session: PortalSessionCreateResult }
  | { success: false; reason: "invalid" | "expired" | "used" | "revoked" };

/**
 * Consumes a magic-link token and creates a portal session.
 * Single-use: marks token as used immediately.
 */
export async function consumePortalAccessToken(
  rawToken: string
): Promise<ConsumeResult> {
  const tokenHash = hashToken(rawToken);
  const supabase = createAdminClient();

  // Look up token
  const { data: tokenRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_access_tokens" as never)
    .select("id, tenant_id, customer_id, normalized_email, expires_at, used_at, revoked_at" as never)
    .eq("token_hash" as never, tokenHash)
    .single();

  if (!tokenRow) {
    return { success: false, reason: "invalid" };
  }

  const token = tokenRow as unknown as {
    id: string;
    tenant_id: string;
    customer_id: string | null;
    normalized_email: string;
    expires_at: string;
    used_at: string | null;
    revoked_at: string | null;
  };

  if (token.revoked_at) {
    return { success: false, reason: "revoked" };
  }

  if (token.used_at) {
    return { success: false, reason: "used" };
  }

  if (new Date(token.expires_at) <= new Date()) {
    return { success: false, reason: "expired" };
  }

  // Mark token as used
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_access_tokens" as never)
    .update({ used_at: new Date().toISOString() } as never)
    .eq("id" as never, token.id);

  // Create session
  const session = await createPortalSession(
    token.tenant_id,
    token.normalized_email,
    token.customer_id
  );

  return { success: true, session };
}

// ─── Create Session ──────────────────────────────────────────────────────────

async function createPortalSession(
  tenantId: string,
  normalizedEmail: string,
  customerId: string | null
): Promise<PortalSessionCreateResult> {
  const rawSessionToken = generateSecureToken();
  const sessionHash = hashToken(rawSessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60_000).toISOString();

  const supabase = createAdminClient();

  const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_sessions" as never)
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      normalized_email: normalizedEmail,
      session_hash: sessionHash,
      expires_at: expiresAt,
    } as never)
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new Error("Failed to create portal session");
  }

  const row = data as unknown as { id: string; expires_at: string };

  return {
    rawSessionToken,
    sessionId: row.id,
    expiresAt: row.expires_at,
    tenantId,
    normalizedEmail,
    customerId,
  };
}

// ─── Validate Session ────────────────────────────────────────────────────────

/**
 * Validates a portal session token and returns context.
 * Updates last_used_at on valid access.
 */
export async function validatePortalSession(
  rawSessionToken: string
): Promise<PortalSessionContext | null> {
  const sessionHash = hashToken(rawSessionToken);
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_sessions" as never)
    .select("id, tenant_id, customer_id, normalized_email, expires_at, revoked_at" as never)
    .eq("session_hash" as never, sessionHash)
    .single();

  if (!data) return null;

  const session = data as unknown as {
    id: string;
    tenant_id: string;
    customer_id: string | null;
    normalized_email: string;
    expires_at: string;
    revoked_at: string | null;
  };

  if (session.revoked_at) return null;
  if (new Date(session.expires_at) <= new Date()) return null;

  // Update last_used_at
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_sessions" as never)
    .update({ last_used_at: new Date().toISOString() } as never)
    .eq("id" as never, session.id);

  return {
    sessionId: session.id,
    tenantId: session.tenant_id,
    normalizedEmail: session.normalized_email,
    customerId: session.customer_id,
    expiresAt: session.expires_at,
  };
}

// ─── Revoke Session (Logout) ─────────────────────────────────────────────────

/**
 * Revokes a portal session (logout).
 */
export async function revokePortalSession(
  rawSessionToken: string
): Promise<void> {
  const sessionHash = hashToken(rawSessionToken);
  const supabase = createAdminClient();

  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_portal_sessions" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("session_hash" as never, sessionHash);
}
