import "server-only";

/**
 * Review Token Service — Milestone 8.7.
 *
 * Generates, validates, and consumes appointment review tokens.
 * Reuses crypto patterns from existing token infrastructure.
 */

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatInTimeZone } from "date-fns-tz";
import type { ReviewTokenContext } from "../types/review";

const TOKEN_BYTES = 32;
const TOKEN_PREFIX_LENGTH = 10;
const TOKEN_TTL_DAYS = 30;

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function getPrefix(raw: string): string {
  return raw.slice(0, TOKEN_PREFIX_LENGTH);
}

// ─── Create Review Token ─────────────────────────────────────────────────────

export async function createReviewToken(
  tenantId: string,
  appointmentId: string
): Promise<{ rawToken: string; tokenId: string } | null> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = getPrefix(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60_000).toISOString();

  const supabase = createAdminClient();

  // Revoke any existing active token for this appointment
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_review_tokens" as never)
    .update({ revoked_at: new Date().toISOString() } as never)
    .eq("appointment_id" as never, appointmentId)
    .eq("tenant_id" as never, tenantId)
    .is("revoked_at" as never, null)
    .is("used_at" as never, null);

  const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_review_tokens" as never)
    .insert({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      expires_at: expiresAt,
    } as never)
    .select("id")
    .single();

  if (error || !data) return null;

  return { rawToken, tokenId: (data as unknown as { id: string }).id };
}

// ─── Resolve Review Token ────────────────────────────────────────────────────

export async function resolveReviewToken(
  rawToken: string
): Promise<ReviewTokenContext | null> {
  const tokenHash = hashToken(rawToken);
  const supabase = createAdminClient();

  // Load token with appointment and tenant
  const { data: tokenRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_review_tokens" as never)
    .select("id, tenant_id, appointment_id, expires_at, used_at, revoked_at" as never)
    .eq("token_hash" as never, tokenHash)
    .single();

  if (!tokenRow) return null;

  const token = tokenRow as unknown as {
    id: string; tenant_id: string; appointment_id: string;
    expires_at: string; used_at: string | null; revoked_at: string | null;
  };

  if (token.revoked_at) return null;
  if (token.used_at) return null;
  if (new Date(token.expires_at) <= new Date()) return null;

  // Load appointment
  const { data: apptRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointments")
    .select("id, tenant_id, status, starts_at, customer_name, service_name_snapshot, service_id, resource_id, location_id" as never)
    .eq("id" as never, token.appointment_id)
    .eq("tenant_id" as never, token.tenant_id)
    .single();

  if (!apptRow) return null;

  const appt = apptRow as unknown as {
    id: string; tenant_id: string; status: string; starts_at: string;
    customer_name: string; service_name_snapshot: string;
    service_id: string; resource_id: string; location_id: string;
  };

  if (appt.status !== "completed") return null;

  // Load tenant
  const { data: tenantRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("tenants" as never)
    .select("name, default_timezone" as never)
    .eq("id" as never, token.tenant_id)
    .single();

  if (!tenantRow) return null;
  const tenant = tenantRow as unknown as { name: string; default_timezone: string };

  // Check existing review
  const { data: existingReview } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_reviews" as never)
    .select("id" as never)
    .eq("tenant_id" as never, token.tenant_id)
    .eq("appointment_id" as never, token.appointment_id)
    .single();

  return {
    tokenId: token.id,
    tenantId: token.tenant_id,
    appointmentId: token.appointment_id,
    tenantName: tenant.name,
    serviceName: appt.service_name_snapshot,
    appointmentDate: formatInTimeZone(appt.starts_at, tenant.default_timezone, "MMMM d, yyyy"),
    customerName: appt.customer_name,
    hasExistingReview: !!existingReview,
  };
}

// ─── Mark Token Used ─────────────────────────────────────────────────────────

export async function markReviewTokenUsed(tokenId: string): Promise<void> {
  const supabase = createAdminClient();
  await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("appointment_review_tokens" as never)
    .update({ used_at: new Date().toISOString() } as never)
    .eq("id" as never, tokenId);
}
