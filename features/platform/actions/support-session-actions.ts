"use server";

/**
 * Platform Support Session Actions — Milestone 15.11.
 *
 * Explicit, audited, time-bounded support sessions.
 * No silent impersonation. Platform admin identity preserved.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";

type ActionResult =
  | { success: true; sessionId?: string }
  | { success: false; message: string };

// ─── Start Support Session ───────────────────────────────────────────────────

export async function startSupportSessionAction(
  tenantId: string,
  reason: string
): Promise<ActionResult> {
  const { user } = await requirePlatformAdmin();

  const log = createServerActionLogger({
    action: "platform.support_session.start",
    tenantId,
    userId: user.id,
  });

  if (!reason || reason.trim().length < 5) {
    return { success: false, message: "Reason must be at least 5 characters." };
  }

  // Verify tenant exists
  const supabase = createServiceRoleClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .single();

  if (!tenant) return { success: false, message: "Tenant not found." };

  // End any existing active session for this admin + tenant
  await supabase
    .from("platform_support_sessions" as never)
    .update({ status: "ended", ended_at: new Date().toISOString() } as never)
    .eq("platform_user_id" as never, user.id)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "active");

  // Create new session (30 min default)
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

  const { data, error } = await supabase
    .from("platform_support_sessions" as never)
    .insert({
      platform_user_id: user.id,
      tenant_id: tenantId,
      reason: reason.trim(),
      status: "active",
      expires_at: expiresAt,
    } as never)
    .select("id" as never)
    .single();

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to start support session." };
  }

  const sessionId = (data as unknown as { id: string })?.id;
  await log.success({ sessionId, tenantId, reason: reason.trim() });
  return { success: true, sessionId };
}

// ─── End Support Session ─────────────────────────────────────────────────────

export async function endSupportSessionAction(
  sessionId: string
): Promise<ActionResult> {
  const { user } = await requirePlatformAdmin();

  const log = createServerActionLogger({
    action: "platform.support_session.end",
    userId: user.id,
  });

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("platform_support_sessions" as never)
    .update({ status: "ended", ended_at: new Date().toISOString() } as never)
    .eq("id" as never, sessionId)
    .eq("platform_user_id" as never, user.id)
    .eq("status" as never, "active");

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to end session." };
  }

  await log.success({ sessionId });
  return { success: true };
}

// ─── Get Active Session ──────────────────────────────────────────────────────

export async function getActiveSupportSession(
  platformUserId: string,
  tenantId: string
): Promise<{ id: string; reason: string; expiresAt: string } | null> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("platform_support_sessions" as never)
    .select("id, reason, expires_at" as never)
    .eq("platform_user_id" as never, platformUserId)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "active")
    .gt("expires_at" as never, new Date().toISOString())
    .order("started_at" as never, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const row = data as unknown as { id: string; reason: string; expires_at: string };
  return { id: row.id, reason: row.reason, expiresAt: row.expires_at };
}
