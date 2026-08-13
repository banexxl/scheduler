"use server";

/**
 * Saved Report Actions — Milestone 15.9.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import type { AdvancedAnalyticsFilters, AnalyticsReportType } from "../types/advanced-analytics";

type ActionResult =
  | { success: true; reportId?: string }
  | { success: false; message: string };

export async function saveReportAction(
  tenantSlug: string,
  input: {
    name: string;
    reportType: AnalyticsReportType;
    filters: AdvancedAnalyticsFilters;
  }
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({
    action: "analytics.report.save",
    tenantId: tenant.id,
    userId: user.id,
  });

  if (!input.name?.trim()) return { success: false, message: "Report name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_analytics_reports" as never)
    .insert({
      tenant_id: tenant.id,
      name: input.name.trim(),
      report_type: input.reportType,
      filters: input.filters,
      created_by: user.id,
    } as never)
    .select("id" as never)
    .single();

  if (error) {
    await log.failure(error);
    return { success: false, message: "Unable to save report." };
  }

  const reportId = (data as unknown as { id: string })?.id;
  await log.success({ reportId });
  revalidatePath(`/${tenantSlug}/analytics`);
  return { success: true, reportId };
}

export async function deleteReportAction(
  tenantSlug: string,
  reportId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_analytics_reports" as never)
    .delete()
    .eq("id" as never, reportId)
    .eq("tenant_id" as never, tenant.id);

  if (error) return { success: false, message: "Unable to delete report." };

  revalidatePath(`/${tenantSlug}/analytics`);
  return { success: true };
}
