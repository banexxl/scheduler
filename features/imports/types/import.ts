/**
 * Data Import Types — Milestone 15.10.
 */

// ─── Import Types ────────────────────────────────────────────────────────────

export type ImportType = "customers" | "services" | "staff_resources";

export type ImportJobStatus =
  | "uploaded"
  | "mapping"
  | "validated"
  | "ready"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export type ImportRowStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "skipped"
  | "created"
  | "updated"
  | "failed";

// ─── Import Job ──────────────────────────────────────────────────────────────

export type ImportJobDTO = {
  id: string;
  tenantId: string;
  importType: ImportType;
  status: ImportJobStatus;
  originalFilename: string;
  fileSizeBytes: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  mapping: Record<string, string>; // csvColumn → canonicalField
  options: ImportOptions;
  createdBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type ImportOptions = {
  duplicateMode?: "create_only" | "create_and_update" | "skip_duplicates";
  blankMeansNoUpdate?: boolean;
};

// ─── Import Row ──────────────────────────────────────────────────────────────

export type ImportRowDTO = {
  id: string;
  rowNumber: number;
  rawData: Record<string, string>;
  normalizedData: Record<string, unknown> | null;
  status: ImportRowStatus;
  errorCodes: string[] | null;
  errorDetails: string[] | null;
  matchedEntityId: string | null;
  resultEntityId: string | null;
};

// ─── Field Registry ──────────────────────────────────────────────────────────

export type FieldType = "string" | "email" | "phone" | "number" | "boolean" | "currency" | "select";

export type ImportFieldDef = {
  key: string;
  label: string;
  required: boolean;
  type: FieldType;
  maxLength?: number;
  aliases: string[]; // For auto-mapping
  description?: string;
};

// ─── Import Adapter Interface ────────────────────────────────────────────────

export type ImportAdapter = {
  type: ImportType;
  fields: ImportFieldDef[];
  templateHeaders: string[];
};

// ─── Validation Result ───────────────────────────────────────────────────────

export type RowValidationResult = {
  valid: boolean;
  errorCodes: string[];
  errorDetails: string[];
  normalizedData: Record<string, unknown> | null;
  matchedEntityId: string | null;
  action: "create" | "update" | "skip" | "invalid";
};

// ─── Error Codes ─────────────────────────────────────────────────────────────

export const IMPORT_ERROR_CODES = {
  required_field_missing: "Required field missing",
  invalid_email: "Invalid email format",
  invalid_phone: "Invalid phone format",
  invalid_currency: "Invalid currency code",
  invalid_boolean: "Invalid boolean value",
  invalid_number: "Invalid number",
  invalid_duration: "Invalid duration",
  field_too_long: "Field exceeds maximum length",
  duplicate_existing: "Duplicate of existing record",
  duplicate_in_file: "Duplicate within this file",
  ambiguous_location: "Ambiguous location reference",
  unknown_resource_type: "Unknown resource type",
  cross_tenant_reference: "Cross-tenant reference not allowed",
} as const;

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMPORT_ROWS = 10_000;
export const MAX_IMPORT_COLUMNS = 100;
export const MAX_FIELD_LENGTH = 5000;
export const IMPORT_BATCH_SIZE = 100;
