/**
 * CSV Parser Service — Milestone 15.10.
 *
 * Uses papaparse for robust CSV handling:
 * - Quoted fields, commas inside quotes, escaped quotes
 * - CRLF/LF line endings
 * - UTF-8 + BOM handling
 * - Row/column count validation
 *
 * Pure utility — no server-only, no DB access.
 */

import Papa from "papaparse";
import { MAX_IMPORT_ROWS, MAX_IMPORT_COLUMNS, MAX_FIELD_LENGTH } from "../types/import";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ParsedCSV = {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  errors: string[];
};

export type CSVValidationResult = {
  valid: boolean;
  errors: string[];
  headers: string[];
  rowCount: number;
};

// ─── Parse ───────────────────────────────────────────────────────────────────

/**
 * Parses a CSV string into structured rows.
 * Handles BOM, quoted fields, CRLF/LF.
 */
export function parseCSV(csvContent: string): ParsedCSV {
  // Remove BOM if present
  const content = csvContent.startsWith("\uFEFF") ? csvContent.slice(1) : csvContent;

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  const errors: string[] = [];

  // Collect parse errors
  for (const err of result.errors) {
    if (err.type === "FieldMismatch" && err.row !== undefined) {
      errors.push(`Row ${err.row + 2}: Column count mismatch`);
    } else if (err.message) {
      errors.push(err.message);
    }
  }

  const headers = result.meta.fields ?? [];

  // Validate bounds
  if (headers.length > MAX_IMPORT_COLUMNS) {
    errors.push(`Too many columns (${headers.length}). Maximum is ${MAX_IMPORT_COLUMNS}.`);
  }

  if (result.data.length > MAX_IMPORT_ROWS) {
    errors.push(`Too many rows (${result.data.length}). Maximum is ${MAX_IMPORT_ROWS}.`);
  }

  // Validate field lengths
  for (let i = 0; i < Math.min(result.data.length, MAX_IMPORT_ROWS); i++) {
    const row = result.data[i]!;
    for (const [key, value] of Object.entries(row)) {
      if (value && value.length > MAX_FIELD_LENGTH) {
        errors.push(`Row ${i + 2}, column "${key}": Field exceeds ${MAX_FIELD_LENGTH} characters.`);
        break; // One error per row is enough
      }
    }
  }

  return {
    headers,
    rows: result.data.slice(0, MAX_IMPORT_ROWS),
    totalRows: result.data.length,
    errors,
  };
}

/**
 * Validates a CSV file before full processing.
 */
export function validateCSVFile(
  content: string,
  fileSize: number
): CSVValidationResult {
  const errors: string[] = [];

  if (fileSize > 10 * 1024 * 1024) {
    errors.push("File exceeds maximum size of 10 MB.");
    return { valid: false, errors, headers: [], rowCount: 0 };
  }

  if (!content.trim()) {
    errors.push("File is empty.");
    return { valid: false, errors, headers: [], rowCount: 0 };
  }

  const parsed = parseCSV(content);
  errors.push(...parsed.errors);

  if (parsed.headers.length === 0) {
    errors.push("No headers detected in CSV file.");
  }

  if (parsed.totalRows === 0) {
    errors.push("No data rows found.");
  }

  return {
    valid: errors.length === 0,
    errors,
    headers: parsed.headers,
    rowCount: parsed.totalRows,
  };
}

// ─── CSV Generation (for templates and error exports) ────────────────────────

/**
 * Escapes a CSV cell value to prevent formula injection.
 * Prefixes dangerous characters with a single quote.
 */
export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");

  // Formula injection prevention
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }

  // Standard CSV escaping
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates a CSV string from headers and rows.
 */
export function generateCSV(headers: string[], rows: Array<Record<string, string>>): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h] ?? "")).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Generates a template CSV with only headers (and optional example row).
 */
export function generateTemplate(headers: string[], exampleRow?: Record<string, string>): string {
  if (exampleRow) {
    return generateCSV(headers, [exampleRow]);
  }
  return headers.map(escapeCsvCell).join(",") + "\n";
}
