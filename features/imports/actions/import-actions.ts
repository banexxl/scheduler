"use server";

/**
 * Import CRUD Actions — Milestone 15.10.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/get-user";
import { getTenantBySlug } from "@/lib/tenants/get-tenant-by-slug";
import { createServerActionLogger } from "@/lib/logging/server-action-logger";
import { parseCSV, validateCSVFile } from "../services/csv-parser";
import { autoMapHeaders, applyMapping } from "../services/field-mapping";
import { CUSTOMER_FIELDS, validateCustomerRow } from "../adapters/customer-adapter";
import { SERVICE_FIELDS, validateServiceRow } from "../adapters/service-adapter";
import { STAFF_FIELDS, validateStaffRow } from "../adapters/staff-adapter";
import type { ImportType, ImportFieldDef } from "../types/import";

type ActionResult =
  | { success: true; jobId?: string; mapping?: Record<string, string> }
  | { success: false; message: string };

function getFieldsForType(type: ImportType): ImportFieldDef[] {
  switch (type) {
    case "customers": return CUSTOMER_FIELDS;
    case "services": return SERVICE_FIELDS;
    case "staff_resources": return STAFF_FIELDS;
  }
}

// ─── Upload & Create Job ─────────────────────────────────────────────────────

export async function createImportJobAction(
  tenantSlug: string,
  importType: ImportType,
  csvContent: string,
  filename: string,
  fileSize: number
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({ action: "data_import.create", tenantId: tenant.id, userId: user.id });

  // Validate file
  const validation = validateCSVFile(csvContent, fileSize);
  if (!validation.valid) {
    return { success: false, message: validation.errors.join(" ") };
  }

  // Auto-map headers
  const fields = getFieldsForType(importType);
  const mapping = autoMapHeaders(validation.headers, fields);

  // Create job
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_import_jobs" as never)
    .insert({
      tenant_id: tenant.id,
      import_type: importType,
      status: "mapping",
      original_filename: filename.slice(0, 500),
      file_size_bytes: fileSize,
      total_rows: validation.rowCount,
      mapping,
      created_by: user.id,
    } as never)
    .select("id" as never)
    .single();

  if (error) { await log.failure(error); return { success: false, message: "Unable to create import job." }; }

  const jobId = (data as unknown as { id: string })?.id;

  // Parse and persist rows
  const parsed = parseCSV(csvContent);
  const serviceRole = createServiceRoleClient();

  const rowInserts = parsed.rows.map((row, idx) => ({
    tenant_id: tenant.id,
    import_job_id: jobId,
    row_number: idx + 1,
    raw_data: row,
    status: "pending",
  }));

  // Insert in batches of 500
  for (let i = 0; i < rowInserts.length; i += 500) {
    const batch = rowInserts.slice(i, i + 500);
    await serviceRole.from("data_import_rows" as never).insert(batch as never);
  }

  await log.success({ jobId, importType, rowCount: validation.rowCount });
  revalidatePath(`/${tenantSlug}/imports`);
  return { success: true, jobId, mapping };
}

// ─── Save Mapping & Validate ─────────────────────────────────────────────────

export async function validateImportAction(
  tenantSlug: string,
  jobId: string,
  mapping: Record<string, string>
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const supabase = createServiceRoleClient();

  // Load job
  const { data: job } = await supabase
    .from("data_import_jobs" as never)
    .select("id, import_type, tenant_id" as never)
    .eq("id" as never, jobId)
    .eq("tenant_id" as never, tenant.id)
    .single();

  if (!job) return { success: false, message: "Import job not found." };
  const importType = (job as unknown as { import_type: string }).import_type as ImportType;

  // Save mapping
  await supabase
    .from("data_import_jobs" as never)
    .update({ mapping, status: "validated" } as never)
    .eq("id" as never, jobId);

  // Load all rows
  const { data: rows } = await supabase
    .from("data_import_rows" as never)
    .select("id, row_number, raw_data" as never)
    .eq("import_job_id" as never, jobId)
    .order("row_number" as never, { ascending: true })
    .limit(10000);

  if (!rows) return { success: false, message: "No rows to validate." };

  // Prefetch existing data for duplicate detection
  const existingEmails = new Set<string>();
  const existingSlugs = new Set<string>();

  if (importType === "customers") {
    const { data: customers } = await supabase
      .from("tenant_customers")
      .select("email")
      .eq("tenant_id", tenant.id)
      .not("email", "is", null)
      .limit(10000);
    for (const c of (customers ?? []) as Array<{ email: string | null }>) {
      if (c.email) existingEmails.add(c.email.toLowerCase());
    }
  } else if (importType === "services") {
    const { data: services } = await supabase
      .from("services")
      .select("slug")
      .eq("tenant_id", tenant.id)
      .limit(10000);
    for (const s of (services ?? []) as Array<{ slug: string }>) {
      existingSlugs.add(s.slug);
    }
  } else if (importType === "staff_resources") {
    const { data: resources } = await supabase
      .from("resources")
      .select("slug")
      .eq("tenant_id", tenant.id)
      .limit(10000);
    for (const r of (resources ?? []) as Array<{ slug: string }>) {
      existingSlugs.add(r.slug);
    }
  }

  // Validate each row
  let validCount = 0;
  let invalidCount = 0;

  for (const row of rows as unknown as Array<{ id: string; row_number: number; raw_data: Record<string, string> }>) {
    const mapped = applyMapping(row.raw_data, mapping);
    let result: { valid: boolean; errorCodes: string[]; errorDetails: string[]; normalizedData: Record<string, unknown> | null; matchedEntityId: string | null; action: string };

    if (importType === "customers") {
      result = validateCustomerRow(mapped, existingEmails);
    } else if (importType === "services") {
      result = validateServiceRow(mapped, existingSlugs);
    } else {
      // Staff — simplified validation (location/type maps would be loaded in full impl)
      result = validateStaffRow(mapped, existingSlugs, new Map(), new Map(), null);
    }

    const rowStatus = result.valid ? "valid" : "invalid";
    if (result.valid) validCount++; else invalidCount++;

    await supabase
      .from("data_import_rows" as never)
      .update({
        status: rowStatus,
        normalized_data: result.normalizedData,
        error_codes: result.errorCodes.length > 0 ? result.errorCodes : null,
        error_details: result.errorDetails.length > 0 ? result.errorDetails : null,
        matched_entity_id: result.matchedEntityId,
      } as never)
      .eq("id" as never, row.id);
  }

  // Update job counts
  await supabase
    .from("data_import_jobs" as never)
    .update({ valid_rows: validCount, invalid_rows: invalidCount, status: "ready" } as never)
    .eq("id" as never, jobId);

  revalidatePath(`/${tenantSlug}/imports/${jobId}`);
  return { success: true, jobId };
}

// ─── Start Processing ────────────────────────────────────────────────────────

export async function startImportProcessingAction(
  tenantSlug: string,
  jobId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const log = createServerActionLogger({ action: "data_import.start", tenantId: tenant.id, userId: user.id });

  const supabase = await createClient();
  const { error } = await supabase
    .from("data_import_jobs" as never)
    .update({ status: "processing", started_at: new Date().toISOString() } as never)
    .eq("id" as never, jobId)
    .eq("tenant_id" as never, tenant.id)
    .eq("status" as never, "ready");

  if (error) { await log.failure(error); return { success: false, message: "Unable to start import." }; }

  await log.success({ jobId });
  revalidatePath(`/${tenantSlug}/imports/${jobId}`);
  return { success: true, jobId };
}

// ─── Cancel Import ───────────────────────────────────────────────────────────

export async function cancelImportAction(
  tenantSlug: string,
  jobId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { success: false, message: "Authentication required." };

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { success: false, message: "Business not found." };

  const supabase = await createClient();
  await supabase
    .from("data_import_jobs" as never)
    .update({ status: "cancelled" } as never)
    .eq("id" as never, jobId)
    .eq("tenant_id" as never, tenant.id)
    .in("status" as never, ["uploaded", "mapping", "validated", "ready"]);

  revalidatePath(`/${tenantSlug}/imports`);
  return { success: true };
}
