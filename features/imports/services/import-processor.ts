import "server-only";

/**
 * Import Processor — Milestone 15.10.
 *
 * Processes import rows in bounded batches.
 * Each row creates/updates the appropriate domain entity.
 * Idempotent: row status prevents duplicate processing.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";
import { IMPORT_BATCH_SIZE } from "../types/import";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProcessImportResult = {
  jobsProcessed: number;
  rowsProcessed: number;
  created: number;
  failed: number;
};

// ─── Process Pending Jobs ────────────────────────────────────────────────────

export async function processImportJobs(): Promise<ProcessImportResult> {
  const supabase = createServiceRoleClient();

  // Find processing jobs
  const { data: jobs } = await supabase
    .from("data_import_jobs" as never)
    .select("id, tenant_id, import_type" as never)
    .eq("status" as never, "processing")
    .limit(3);

  if (!jobs || (jobs as unknown[]).length === 0) {
    return { jobsProcessed: 0, rowsProcessed: 0, created: 0, failed: 0 };
  }

  let totalRows = 0;
  let totalCreated = 0;
  let totalFailed = 0;

  for (const job of jobs as unknown as Array<{ id: string; tenant_id: string; import_type: string }>) {
    const result = await processOneJob(supabase, job);
    totalRows += result.rowsProcessed;
    totalCreated += result.created;
    totalFailed += result.failed;
  }

  return { jobsProcessed: (jobs as unknown[]).length, rowsProcessed: totalRows, created: totalCreated, failed: totalFailed };
}

async function processOneJob(
  supabase: ReturnType<typeof createServiceRoleClient>,
  job: { id: string; tenant_id: string; import_type: string }
): Promise<{ rowsProcessed: number; created: number; failed: number }> {
  let created = 0;
  let failed = 0;

  // Claim a batch of valid rows
  const { data: claimed } = await supabase.rpc("claim_import_rows_batch" as never, {
    p_job_id: job.id,
    p_batch_size: IMPORT_BATCH_SIZE,
  } as never);

  const rows = (claimed ?? []) as unknown as Array<{
    row_id: string; row_number: number;
    normalized_data: Record<string, unknown>; matched_entity_id: string | null;
  }>;

  if (rows.length === 0) {
    // No more rows to process — finalize
    await supabase.rpc("finalize_import_job" as never, { p_job_id: job.id } as never);
    return { rowsProcessed: 0, created: 0, failed: 0 };
  }

  for (const row of rows) {
    try {
      const entityId = await processRow(supabase, job, row);
      await supabase
        .from("data_import_rows" as never)
        .update({ status: "created", result_entity_id: entityId } as never)
        .eq("id" as never, row.row_id);
      created++;
    } catch (err) {
      await supabase
        .from("data_import_rows" as never)
        .update({ status: "failed", error_codes: ["processing_error"] } as never)
        .eq("id" as never, row.row_id);
      failed++;
      logger.warn("import_row_processing_failed", { jobId: job.id, rowNumber: row.row_number }, err);
    }
  }

  // Check if more rows remain
  const { count: remaining } = await supabase
    .from("data_import_rows" as never)
    .select("id" as never, { count: "exact", head: true })
    .eq("import_job_id" as never, job.id)
    .eq("status" as never, "valid");

  if ((remaining ?? 0) === 0) {
    await supabase.rpc("finalize_import_job" as never, { p_job_id: job.id } as never);
  }

  return { rowsProcessed: rows.length, created, failed };
}

// ─── Process Individual Row ──────────────────────────────────────────────────

async function processRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  job: { id: string; tenant_id: string; import_type: string },
  row: { row_id: string; normalized_data: Record<string, unknown>; matched_entity_id: string | null }
): Promise<string> {
  switch (job.import_type) {
    case "customers":
      return processCustomerRow(supabase, job.tenant_id, row.normalized_data);
    case "services":
      return processServiceRow(supabase, job.tenant_id, row.normalized_data);
    case "staff_resources":
      return processStaffRow(supabase, job.tenant_id, row.normalized_data);
    default:
      throw new Error(`Unknown import type: ${job.import_type}`);
  }
}

async function processCustomerRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  data: Record<string, unknown>
): Promise<string> {
  const { data: result, error } = await supabase
    .from("tenant_customers")
    .insert({
      tenant_id: tenantId,
      name: String(data.name ?? ""),
      email: data.email ? String(data.email) : null,
      phone_number: data.phone_number ? String(data.phone_number) : null,
      marketing_opt_in: Boolean(data.marketing_opt_in),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (result as { id: string }).id;
}

async function processServiceRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  data: Record<string, unknown>
): Promise<string> {
  const { data: result, error } = await supabase
    .from("services")
    .insert({
      tenant_id: tenantId,
      name: String(data.name ?? ""),
      slug: String(data.slug ?? "service"),
      duration_minutes: Number(data.duration_minutes ?? 30),
      price: Number(data.price ?? 0),
      currency: String(data.currency ?? "RSD"),
      description: data.description ? String(data.description) : null,
      is_active: data.is_active !== false,
      buffer_before_minutes: Number(data.buffer_before_minutes ?? 0),
      buffer_after_minutes: Number(data.buffer_after_minutes ?? 0),
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (result as { id: string }).id;
}

async function processStaffRow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  data: Record<string, unknown>
): Promise<string> {
  // Use create_resource_with_locations RPC for atomic creation
  const locationIds = data.location_id ? [String(data.location_id)] : [];

  const { data: resourceId, error } = await supabase.rpc("create_resource_with_locations" as never, {
    p_tenant_id: tenantId,
    p_resource_type_id: String(data.resource_type_id ?? ""),
    p_name: String(data.name ?? ""),
    p_slug: String(data.slug ?? "resource"),
    p_description: data.description ? String(data.description) : null,
    p_email: data.email ? String(data.email) : null,
    p_phone_number: data.phone_number ? String(data.phone_number) : null,
    p_is_active: data.is_active !== false,
    p_location_ids: locationIds,
    p_primary_location_id: locationIds[0] ?? null,
  } as never);

  if (error) throw new Error(error.message);

  // Create staff profile if human resource
  const resId = String(resourceId);
  if (data.job_title || true) { // Always create staff_profile for imported "staff"
    await supabase
      .from("staff_profiles" as never)
      .insert({
        tenant_id: tenantId,
        resource_id: resId,
        display_name: String(data.name ?? ""),
        job_title: data.job_title ? String(data.job_title) : null,
        bio: data.description ? String(data.description) : null,
        is_active: true,
        is_public: true,
      } as never);
  }

  return resId;
}
