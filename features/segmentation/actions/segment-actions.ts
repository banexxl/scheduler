"use server";

/**
 * Segment CRUD Actions — Milestone 15.6.1.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { validateSegmentRules } from "../utils/validate-segment-rules";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { SegmentRuleGroup } from "../types/segment";

type SegmentResult =
  | { success: true; segmentId?: string }
  | { success: false; message: string; errors?: string[] };

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createSegmentAction(
  tenantSlug: string,
  input: { name: string; description?: string; rules: SegmentRuleGroup }
): Promise<SegmentResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active", "trialing"].includes(tenant.status)) {
    return { success: false, message: "Business not found." };
  }

  const log = createServerActionLogger({
    action: "customer_segment.create",
    tenantId: tenant.id,
    userId: user.id,
  });

  if (!input.name || input.name.trim().length < 1) {
    return { success: false, message: "Segment name is required." };
  }

  const validation = validateSegmentRules(input.rules);
  if (!validation.valid) {
    await log.validationFailed();
    return { success: false, message: "Invalid segment rules.", errors: validation.errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_segments")
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      segment_type: "custom",
      rules: input.rules as never,
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to create segment." };
  }

  await log.success({ segmentId: data.id });
  revalidatePath(`/${tenantSlug}/customers/segments`);
  return { success: true, segmentId: data.id };
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateSegmentAction(
  tenantSlug: string,
  segmentId: string,
  input: { name: string; description?: string; rules: SegmentRuleGroup }
): Promise<SegmentResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active", "trialing"].includes(tenant.status)) {
    return { success: false, message: "Business not found." };
  }

  const log = createServerActionLogger({
    action: "customer_segment.update",
    tenantId: tenant.id,
    userId: user.id,
  });

  const validation = validateSegmentRules(input.rules);
  if (!validation.valid) {
    return { success: false, message: "Invalid segment rules.", errors: validation.errors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_segments")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      rules: input.rules as never,
    })
    .eq("id", segmentId)
    .eq("tenant_id", tenant.id);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to update segment." };
  }

  await log.success({ segmentId });
  revalidatePath(`/${tenantSlug}/customers/segments`);
  revalidatePath(`/${tenantSlug}/customers/segments/${segmentId}`);
  return { success: true, segmentId };
}

// ─── Duplicate ───────────────────────────────────────────────────────────────

export async function duplicateSegmentAction(
  tenantSlug: string,
  segmentId: string
): Promise<SegmentResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const supabase = await createClient();

  // Load existing
  const { data: existing } = await supabase
    .from("customer_segments")
    .select("name, description, rules")
    .eq("id", segmentId)
    .eq("tenant_id", tenant.id)
    .single();

  if (!existing) return { success: false, message: "Segment not found." };

  // Create copy
  const { data, error } = await supabase
    .from("customer_segments")
    .insert({
      tenant_id: tenant.id,
      name: `Copy of ${existing.name}`,
      description: existing.description,
      segment_type: "custom",
      rules: existing.rules,
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, message: "Unable to duplicate segment." };

  revalidatePath(`/${tenantSlug}/customers/segments`);
  return { success: true, segmentId: data.id };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteSegmentAction(
  tenantSlug: string,
  segmentId: string
): Promise<SegmentResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "customer_segment.delete",
    tenantId: tenant.id,
    userId: user.id,
  });

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_segments")
    .delete()
    .eq("id", segmentId)
    .eq("tenant_id", tenant.id);

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to delete segment." };
  }

  await log.success({ segmentId });
  revalidatePath(`/${tenantSlug}/customers/segments`);
  return { success: true };
}
