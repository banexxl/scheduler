"use server";

/**
 * Feature Override Actions — Milestone 15.11.
 *
 * Platform admin creates/removes tenant feature overrides (kill switches).
 * Every mutation is audited with reason.
 */

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/platform/require-platform-admin";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { PlatformFeature } from "../services/feature-override-service";

type ActionResult =
  | { success: true }
  | { success: false; message: string };

// ─── Create Override ─────────────────────────────────────────────────────────

export async function createFeatureOverrideAction(
  tenantId: string,
  feature: PlatformFeature,
  enabled: boolean,
  reason: string,
  expiresInMinutes?: number
): Promise<ActionResult> {
  const { user } = await requirePlatformAdmin();

  const log = createServerActionLogger({
    action: "platform.feature_override.create",
    tenantId,
    userId: user.id,
  });

  if (!reason || reason.trim().length < 5) {
    return { success: false, message: "Reason must be at least 5 characters." };
  }

  const supabase = createServiceRoleClient();

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60_000).toISOString()
    : null;

  const { error } = await supabase
    .from("platform_tenant_feature_overrides" as never)
    .upsert({
      tenant_id: tenantId,
      feature,
      enabled,
      reason: reason.trim(),
      created_by: user.id,
      expires_at: expiresAt,
    } as never, {
      onConflict: "tenant_id,feature",
    } as never);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to create override." };
  }

  await log.success({ tenantId, feature, enabled, expiresAt });
  revalidatePath(`/platform/tenants/${tenantId}`);
  return { success: true };
}

// ─── Remove Override ─────────────────────────────────────────────────────────

export async function removeFeatureOverrideAction(
  tenantId: string,
  feature: PlatformFeature
): Promise<ActionResult> {
  const { user } = await requirePlatformAdmin();

  const log = createServerActionLogger({
    action: "platform.feature_override.remove",
    tenantId,
    userId: user.id,
  });

  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("platform_tenant_feature_overrides" as never)
    .delete()
    .eq("tenant_id" as never, tenantId)
    .eq("feature" as never, feature);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to remove override." };
  }

  await log.success({ tenantId, feature });
  revalidatePath(`/platform/tenants/${tenantId}`);
  return { success: true };
}
