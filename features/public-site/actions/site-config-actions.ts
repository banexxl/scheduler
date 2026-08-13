"use server";

/**
 * Public Site Config Actions — Milestone 15.13.
 *
 * Server actions for:
 * - Loading draft config (authenticated tenant members)
 * - Saving draft config (owner/admin)
 * - Publishing config (owner/admin, version-checked)
 *
 * Security:
 * - All mutations require owner/admin role
 * - Publishing uses optimistic version checking
 * - Draft is never exposed to anonymous
 * - Config is validated/sanitized before save
 */

import { revalidatePath } from "next/cache";
import { requireTenantRole } from "@/lib/tenants/require-tenant-role";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveSiteConfig, validateSiteConfigForSave } from "../utils/validate-site-config";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { TenantPublicSiteConfig } from "../types/site-config";

// ─── Load Draft ──────────────────────────────────────────────────────────────

export type LoadDraftResult = {
  success: true;
  config: TenantPublicSiteConfig;
  draftVersion: number;
  publishedVersion: number;
  publishedAt: string | null;
} | {
  success: false;
  error: string;
};

/**
 * Loads the draft site config for editing.
 * Creates a default row if none exists.
 */
export async function loadSiteDraftAction(
  tenantSlug: string
): Promise<LoadDraftResult> {
  const { tenant } = await requireTenantRole(tenantSlug, ["owner", "admin", "manager"]);
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("tenant_public_site_settings" as never)
    .select("draft_config, draft_version, published_version, published_at" as never)
    .eq("tenant_id" as never, tenant.id)
    .maybeSingle();

  if (!data) {
    // Create default row
    const { resolveSiteConfig: _resolve } = await import("../utils/validate-site-config");
    const defaultConfig = _resolve(null);

    await supabase
      .from("tenant_public_site_settings" as never)
      .insert({
        tenant_id: tenant.id,
        draft_config: defaultConfig,
        draft_version: 1,
        published_config: {},
        published_version: 0,
      } as never);

    return {
      success: true,
      config: defaultConfig,
      draftVersion: 1,
      publishedVersion: 0,
      publishedAt: null,
    };
  }

  const row = data as unknown as {
    draft_config: unknown;
    draft_version: number;
    published_version: number;
    published_at: string | null;
  };

  return {
    success: true,
    config: resolveSiteConfig(row.draft_config),
    draftVersion: row.draft_version,
    publishedVersion: row.published_version,
    publishedAt: row.published_at,
  };
}

// ─── Save Draft ──────────────────────────────────────────────────────────────

export type SaveDraftResult = {
  success: true;
  draftVersion: number;
} | {
  success: false;
  error: string;
  validationErrors?: Array<{ field: string; message: string }>;
};

/**
 * Saves draft site config. Validates and sanitizes content.
 * Increments draft_version.
 */
export async function saveSiteDraftAction(
  tenantSlug: string,
  config: TenantPublicSiteConfig
): Promise<SaveDraftResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();

  const log = createServerActionLogger({
    action: "public_site.save_draft",
    tenantId: tenant.id,
    userId: user.id,
  });

  // Validate
  const validationErrors = validateSiteConfigForSave(config);
  if (validationErrors.length > 0) {
    return { success: false, error: "Configuration has validation errors.", validationErrors };
  }

  // Sanitize through resolver (strips any unsafe content)
  const sanitized = resolveSiteConfig(config);

  // Validate featured service IDs belong to tenant
  if (sanitized.services.featuredServiceIds.length > 0) {
    const { data: validServices } = await supabase
      .from("services")
      .select("id")
      .eq("tenant_id", tenant.id)
      .in("id", sanitized.services.featuredServiceIds);

    const validIds = new Set(((validServices ?? []) as unknown as Array<{ id: string }>).map(s => s.id));
    sanitized.services.featuredServiceIds = sanitized.services.featuredServiceIds.filter(id => validIds.has(id));
  }

  // Validate about media asset belongs to tenant
  if (sanitized.about.mediaAssetId) {
    const { data: media } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", sanitized.about.mediaAssetId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!media) {
      sanitized.about.mediaAssetId = null;
    }
  }

  // Upsert with version increment
  const { data: existing } = await supabase
    .from("tenant_public_site_settings" as never)
    .select("draft_version" as never)
    .eq("tenant_id" as never, tenant.id)
    .maybeSingle();

  const currentVersion = (existing as unknown as { draft_version?: number } | null)?.draft_version ?? 0;
  const newVersion = currentVersion + 1;

  if (existing) {
    await supabase
      .from("tenant_public_site_settings" as never)
      .update({
        draft_config: sanitized,
        draft_version: newVersion,
      } as never)
      .eq("tenant_id" as never, tenant.id);
  } else {
    await supabase
      .from("tenant_public_site_settings" as never)
      .insert({
        tenant_id: tenant.id,
        draft_config: sanitized,
        draft_version: 1,
        published_config: {},
        published_version: 0,
      } as never);
  }

  await log.success({ version: newVersion, sections: sanitized.sections.filter(s => s.enabled).length });

  return { success: true, draftVersion: newVersion };
}

// ─── Publish ─────────────────────────────────────────────────────────────────

export type PublishResult = {
  success: true;
  publishedVersion: number;
} | {
  success: false;
  error: string;
  code?: "version_conflict" | "not_found" | "unauthorized";
};

/**
 * Publishes the current draft atomically.
 * Uses version check to prevent stale overwrites.
 */
export async function publishSiteConfigAction(
  tenantSlug: string,
  expectedDraftVersion: number
): Promise<PublishResult> {
  const { user, tenant } = await requireTenantRole(tenantSlug, ["owner", "admin"]);
  const supabase = createServiceRoleClient();

  const log = createServerActionLogger({
    action: "public_site.publish",
    tenantId: tenant.id,
    userId: user.id,
  });

  const { data: result, error } = await supabase.rpc("publish_site_config", {
    p_tenant_id: tenant.id,
    p_actor_user_id: user.id,
    p_expected_draft_version: expectedDraftVersion,
  });

  if (error) {
    await log.failure(error);
    return { success: false, error: "Unable to publish. Please try again." };
  }

  const rpcResult = (typeof result === "string" ? JSON.parse(result) : result) as Record<string, unknown>;

  switch (rpcResult?.status) {
    case "published":
      await log.success({ version: rpcResult.version });
      revalidatePath(`/book/${tenantSlug}`);
      return { success: true, publishedVersion: rpcResult.version as number };

    case "version_conflict":
      return {
        success: false,
        error: "Another admin has made changes. Please reload and try again.",
        code: "version_conflict",
      };

    case "not_found":
      return { success: false, error: "Site settings not found.", code: "not_found" };

    case "unauthorized":
      return { success: false, error: "You do not have permission to publish.", code: "unauthorized" };

    default:
      await log.failure(new Error(`Unexpected RPC status: ${String(rpcResult?.status)}`));
      return { success: false, error: "Unable to publish. Please try again." };
  }
}
