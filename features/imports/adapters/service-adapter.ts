/**
 * Service Import Adapter — Milestone 15.10.
 *
 * Fields, validation, normalization for service CSV imports.
 * Price is decimal (not minor units). Currency must be explicit.
 * Slug auto-generated from name if not provided.
 */

import type { ImportAdapter, ImportFieldDef, RowValidationResult } from "../types/import";

export const SERVICE_FIELDS: ImportFieldDef[] = [
  { key: "name", label: "Service Name", required: true, type: "string", maxLength: 120, aliases: ["service_name", "servicename", "naziv", "usluga"] },
  { key: "duration_minutes", label: "Duration (minutes)", required: true, type: "number", aliases: ["duration", "trajanje", "minutes", "mins"] },
  { key: "price", label: "Price", required: true, type: "number", aliases: ["cena", "cijena", "cost"] },
  { key: "currency", label: "Currency", required: true, type: "currency", maxLength: 3, aliases: ["valuta"] },
  { key: "description", label: "Description", required: false, type: "string", maxLength: 2000, aliases: ["opis", "desc"] },
  { key: "is_active", label: "Active", required: false, type: "boolean", aliases: ["active", "aktivan", "enabled"] },
  { key: "buffer_before", label: "Buffer Before (min)", required: false, type: "number", aliases: ["buffer_before_minutes"] },
  { key: "buffer_after", label: "Buffer After (min)", required: false, type: "number", aliases: ["buffer_after_minutes"] },
];

export const SERVICE_ADAPTER: ImportAdapter = {
  type: "services",
  fields: SERVICE_FIELDS,
  templateHeaders: ["Service Name", "Duration (minutes)", "Price", "Currency", "Description", "Active"],
};

function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63) || "service";
}

export function validateServiceRow(
  mapped: Record<string, string>,
  existingSlugs: Set<string>
): RowValidationResult {
  const errorCodes: string[] = [];
  const errorDetails: string[] = [];

  const name = mapped.name?.trim();
  if (!name || name.length < 2) { errorCodes.push("required_field_missing"); errorDetails.push("Service Name is required (min 2 chars)."); }
  if (name && name.length > 120) { errorCodes.push("field_too_long"); errorDetails.push("Service Name exceeds 120 characters."); }

  const duration = parseInt(mapped.duration_minutes ?? "", 10);
  if (isNaN(duration) || duration < 5 || duration > 1440) { errorCodes.push("invalid_duration"); errorDetails.push("Duration must be 5–1440 minutes."); }

  const price = parseFloat(mapped.price ?? "");
  if (isNaN(price) || price < 0) { errorCodes.push("invalid_number"); errorDetails.push("Price must be a non-negative number."); }

  const currency = mapped.currency?.trim().toUpperCase();
  if (!currency || !/^[A-Z]{3}$/.test(currency)) { errorCodes.push("invalid_currency"); errorDetails.push("Currency must be a 3-letter code (e.g. RSD, EUR)."); }

  // Generate slug and check duplicate
  const slug = name ? generateSlug(name) : "";
  if (slug && existingSlugs.has(slug)) { errorCodes.push("duplicate_existing"); errorDetails.push(`Service with slug "${slug}" already exists.`); }

  if (errorCodes.length > 0) {
    return { valid: false, errorCodes, errorDetails, normalizedData: null, matchedEntityId: null, action: "invalid" };
  }

  return {
    valid: true, errorCodes: [], errorDetails: [],
    normalizedData: {
      name: name!,
      slug,
      duration_minutes: duration,
      price,
      currency: currency!,
      description: mapped.description?.trim() || null,
      is_active: mapped.is_active?.trim().toLowerCase() === "false" ? false : true,
      buffer_before_minutes: parseInt(mapped.buffer_before ?? "0", 10) || 0,
      buffer_after_minutes: parseInt(mapped.buffer_after ?? "0", 10) || 0,
    },
    matchedEntityId: null, action: "create",
  };
}
