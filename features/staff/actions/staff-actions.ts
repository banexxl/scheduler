"use server";

/**
 * Staff Profile Actions — Milestone 12.2.
 */

import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";
import type { UpdateStaffInput } from "../types/staff";

type ActionResult = { success: true; id?: string } | { success: false; error: string };

// ─── Create Staff Profile ────────────────────────────────────────────────────

export async function createStaffProfileAction(
  tenantSlug: string,
  input: {
    displayName: string;
    jobTitle?: string | null;
    resourceId: string;
    tenantMemberId?: string | null;
  }
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    // Verify resource belongs to tenant
    const { data: resource } = await supabase
      .from("resources")
      .select("id")
      .eq("id", input.resourceId)
      .eq("tenant_id", tenant.id)
      .single();

    if (!resource) return { success: false, error: "Resource not found." };

    // Verify member if provided
    if (input.tenantMemberId) {
      const { data: member } = await supabase
        .from("tenant_members")
        .select("id")
        .eq("id", input.tenantMemberId)
        .eq("tenant_id", tenant.id)
        .single();

      if (!member) return { success: false, error: "Team member not found." };
    }

    const { data, error } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("staff_profiles" as never)
      .insert({
        tenant_id: tenant.id,
        resource_id: input.resourceId,
        tenant_member_id: input.tenantMemberId ?? null,
        display_name: input.displayName.trim(),
        job_title: input.jobTitle?.trim() ?? null,
      } as never)
      .select("id")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { success: false, error: "A staff profile already exists for this resource." };
      }
      return { success: false, error: "Failed to create staff profile." };
    }

    logger.info("staff.profile.created", { tenantId: tenant.id, operation: "create_staff" });
    return { success: true, id: (data as unknown as { id: string }).id };
  } catch {
    return { success: false, error: "Failed to create staff profile." };
  }
}

// ─── Update Staff Profile ────────────────────────────────────────────────────

export async function updateStaffProfileAction(
  tenantSlug: string,
  staffId: string,
  input: UpdateStaffInput
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    const updates: Record<string, unknown> = {};
    if (input.displayName !== undefined) updates.display_name = input.displayName.trim();
    if (input.jobTitle !== undefined) updates.job_title = input.jobTitle?.trim() ?? null;
    if (input.bio !== undefined) updates.bio = input.bio;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.isPublic !== undefined) updates.is_public = input.isPublic;

    if (Object.keys(updates).length === 0) return { success: true };

    const { error } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("staff_profiles" as never)
      .update(updates as never)
      .eq("id" as never, staffId)
      .eq("tenant_id" as never, tenant.id);

    if (error) return { success: false, error: "Failed to update staff profile." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update staff profile." };
  }
}

// ─── Link/Unlink Account ─────────────────────────────────────────────────────

export async function linkStaffAccountAction(
  tenantSlug: string,
  staffId: string,
  tenantMemberId: string | null
): Promise<ActionResult> {
  try {
    const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
    const supabase = createServiceRoleClient();

    if (tenantMemberId) {
      // Verify member belongs to tenant
      const { data: member } = await supabase
        .from("tenant_members")
        .select("id")
        .eq("id", tenantMemberId)
        .eq("tenant_id", tenant.id)
        .single();

      if (!member) return { success: false, error: "Team member not found." };
    }

    const { error } = await (supabase as never as ReturnType<typeof createServiceRoleClient>)
      .from("staff_profiles" as never)
      .update({ tenant_member_id: tenantMemberId } as never)
      .eq("id" as never, staffId)
      .eq("tenant_id" as never, tenant.id);

    if (error) {
      if ((error as { code?: string }).code === "23505") {
        return { success: false, error: "This team member is already linked to another staff profile." };
      }
      return { success: false, error: "Failed to update account link." };
    }

    const op = tenantMemberId ? "staff.member.linked" : "staff.member.unlinked";
    logger.info(op, { tenantId: tenant.id, operation: op });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update account link." };
  }
}
