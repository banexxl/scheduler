/**
 * Staff/Resource Import Adapter — Milestone 15.10.
 *
 * Creates resources + staff_profiles atomically.
 * Does NOT create tenant_members or auth.users.
 * Slug auto-generated from name.
 * Requires existing resource_type and location.
 */

import type { ImportAdapter, ImportFieldDef, RowValidationResult } from "../types/import";

export const STAFF_FIELDS: ImportFieldDef[] = [
  { key: "name", label: "Display Name", required: true, type: "string", maxLength: 120, aliases: ["display_name", "full_name", "staff_name", "resource_name", "ime"] },
  { key: "job_title", label: "Job Title", required: false, type: "string", maxLength: 120, aliases: ["title", "role", "position", "pozicija", "titula"] },
  { key: "email", label: "Email", required: false, type: "email", maxLength: 254, aliases: ["e-mail", "mail"] },
  { key: "phone", label: "Phone", required: false, type: "phone", maxLength: 40, aliases: ["phone_number", "mobile", "telefon"] },
  { key: "description", label: "Bio/Description", required: false, type: "string", maxLength: 2000, aliases: ["bio", "opis"] },
  { key: "location", label: "Location", required: false, type: "string", maxLength: 200, aliases: ["location_name", "lokacija"] },
  { key: "resource_type", label: "Resource Type", required: false, type: "string", maxLength: 120, aliases: ["type", "tip", "vrsta"] },
  { key: "is_active", label: "Active", required: false, type: "boolean", aliases: ["active", "aktivan"] },
];

export const STAFF_ADAPTER: ImportAdapter = {
  type: "staff_resources",
  fields: STAFF_FIELDS,
  templateHeaders: ["Display Name", "Job Title", "Email", "Phone", "Bio/Description", "Location", "Resource Type", "Active"],
};

function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63) || "resource";
}

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateStaffRow(
  mapped: Record<string, string>,
  existingSlugs: Set<string>,
  locationMap: Map<string, string>, // normalized name → id
  resourceTypeMap: Map<string, string>, // normalized name → id
  defaultResourceTypeId: string | null
): RowValidationResult {
  const errorCodes: string[] = [];
  const errorDetails: string[] = [];

  const name = mapped.name?.trim();
  if (!name || name.length < 1) { errorCodes.push("required_field_missing"); errorDetails.push("Display Name is required."); }
  if (name && name.length > 120) { errorCodes.push("field_too_long"); errorDetails.push("Display Name exceeds 120 characters."); }

  // Email validation
  const email = mapped.email?.trim().toLowerCase();
  if (email && !EMAIL_REGEX.test(email)) { errorCodes.push("invalid_email"); errorDetails.push("Invalid email format."); }

  // Location resolution
  let locationId: string | null = null;
  const locationName = mapped.location?.trim().toLowerCase();
  if (locationName) {
    locationId = locationMap.get(locationName) ?? null;
    if (!locationId) { errorCodes.push("ambiguous_location"); errorDetails.push(`Location "${mapped.location}" not found.`); }
  }

  // Resource type resolution
  let resourceTypeId = defaultResourceTypeId;
  const typeName = mapped.resource_type?.trim().toLowerCase();
  if (typeName) {
    resourceTypeId = resourceTypeMap.get(typeName) ?? null;
    if (!resourceTypeId) { errorCodes.push("unknown_resource_type"); errorDetails.push(`Resource type "${mapped.resource_type}" not found.`); }
  }
  if (!resourceTypeId) { errorCodes.push("unknown_resource_type"); errorDetails.push("No resource type available. Create a resource type first."); }

  // Slug duplicate check
  const slug = name ? generateSlug(name) : "";
  if (slug && existingSlugs.has(slug)) { errorCodes.push("duplicate_existing"); errorDetails.push(`Resource with slug "${slug}" already exists.`); }

  if (errorCodes.length > 0) {
    return { valid: false, errorCodes, errorDetails, normalizedData: null, matchedEntityId: null, action: "invalid" };
  }

  return {
    valid: true, errorCodes: [], errorDetails: [],
    normalizedData: {
      name: name!,
      slug,
      job_title: mapped.job_title?.trim() || null,
      email: email || null,
      phone_number: mapped.phone?.trim() || null,
      description: mapped.description?.trim() || null,
      location_id: locationId,
      resource_type_id: resourceTypeId,
      is_active: mapped.is_active?.trim().toLowerCase() === "false" ? false : true,
    },
    matchedEntityId: null, action: "create",
  };
}
