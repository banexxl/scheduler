/**
 * Field Mapping Service — Milestone 15.10.
 *
 * Auto-maps CSV headers to canonical fields using alias registry.
 * Pure utility — no DB access.
 */

import type { ImportFieldDef } from "../types/import";

// ─── Auto-Map ────────────────────────────────────────────────────────────────

/**
 * Attempts to auto-map CSV headers to canonical import fields.
 * Returns a mapping of csvHeader → canonicalFieldKey.
 * Unmapped headers are not included.
 */
export function autoMapHeaders(
  csvHeaders: string[],
  fieldDefs: ImportFieldDef[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of csvHeaders) {
    const normalized = header.toLowerCase().trim().replace(/[_\-\s]+/g, "");

    for (const field of fieldDefs) {
      if (usedFields.has(field.key)) continue;

      // Check exact key match
      if (normalized === field.key.toLowerCase().replace(/[_\-\s]+/g, "")) {
        mapping[header] = field.key;
        usedFields.add(field.key);
        break;
      }

      // Check aliases
      const matchedAlias = field.aliases.find((alias) =>
        alias.toLowerCase().replace(/[_\-\s]+/g, "") === normalized
      );

      if (matchedAlias) {
        mapping[header] = field.key;
        usedFields.add(field.key);
        break;
      }
    }
  }

  return mapping;
}

/**
 * Validates that all required fields are mapped.
 */
export function validateMapping(
  mapping: Record<string, string>,
  fieldDefs: ImportFieldDef[]
): { valid: boolean; missingRequired: string[] } {
  const mappedFields = new Set(Object.values(mapping));
  const missingRequired: string[] = [];

  for (const field of fieldDefs) {
    if (field.required && !mappedFields.has(field.key)) {
      missingRequired.push(field.label);
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
  };
}

/**
 * Applies mapping to a raw CSV row, producing a mapped record.
 */
export function applyMapping(
  rawRow: Record<string, string>,
  mapping: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [csvHeader, fieldKey] of Object.entries(mapping)) {
    const value = rawRow[csvHeader];
    if (value !== undefined) {
      result[fieldKey] = value;
    }
  }

  return result;
}
