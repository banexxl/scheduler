"use server";

/**
 * Template Server Actions — Milestone 16.2.
 *
 * - getAvailableTemplates  → list all registered templates
 * - getActiveTemplate      → current template for a tenant
 * - updateTenantTemplate   → activate a new template
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { getAllTemplateInfos, isValidTemplateId } from "../registry";
import { DEFAULT_TEMPLATE_ID, type TemplateId } from "../types";
import type { TemplateInfo } from "../types";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";

// ─── Result Types ────────────────────────────────────────────────────────────

type ActionResult =
  | { success: true; message?: string }
  | { success: false; message: string };

// ─── Get Available Templates ─────────────────────────────────────────────────

/**
 * Returns all registered templates with serializable info.
 * No auth required — template metadata is not sensitive.
 */
export async function getAvailableTemplates(): Promise<TemplateInfo[]> {
  return getAllTemplateInfos();
}

// ─── Get Active Template ─────────────────────────────────────────────────────

/**
 * Returns the active template ID for a tenant.
 * Uses service role client since this may be called from server components.
 */
export async function getActiveTemplate(
  tenantId: string
): Promise<TemplateId> {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("tenant_branding_settings")
      .select("template")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const template = (data as { template?: string } | null)?.template;
    if (template && isValidTemplateId(template)) {
      return template;
    }
  } catch {
    // Fall through to default
  }

  return DEFAULT_TEMPLATE_ID;
}

// ─── Update Tenant Template ──────────────────────────────────────────────────

/**
 * Activates a new template for a tenant.
 * Requires owner/admin role. Immediately reflected on public booking.
 */
export async function updateTenantTemplate(
  tenantSlug: string,
  templateId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !["active", "trialing"].includes(tenant.status)) {
    return { success: false, message: "Business not found." };
  }

  const log = createServerActionLogger({
    action: "templates.update",
    tenantId: tenant.id,
    userId: user.id,
  });

  // Validate template ID
  if (!isValidTemplateId(templateId)) {
    await log.validationFailed();
    return { success: false, message: "Invalid template." };
  }

  // Use the RPC for atomic upsert + role check
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "update_tenant_template" as never,
    {
      p_tenant_id: tenant.id,
      p_actor_user_id: user.id,
      p_template: templateId,
    } as never
  );

  const result = data as { status: string } | null;

  if (error || !result || result.status !== "ok") {
    if (result?.status === "unauthorized") {
      await log.unauthorized();
      return { success: false, message: "Only owners and admins can change the template." };
    }
    await log.failure(error);
    return { success: false, message: "Unable to update template." };
  }

  await log.success({ template: templateId });

  // Revalidate both the settings page and the public booking portal
  revalidatePath(`/${tenantSlug}/settings/templates`);
  revalidatePath(`/book/${tenantSlug}`);

  return { success: true, message: "Template activated." };
}
