/**
 * Customer Import Adapter — Milestone 15.10.
 *
 * Defines fields, validation, normalization, and duplicate detection
 * for customer CSV imports.
 *
 * Marketing consent: NOT inferred from email presence.
 * Missing/blank = false (not opted in).
 * Imported customers do NOT create auth.users.
 */

import type { ImportAdapter, ImportFieldDef, RowValidationResult } from "../types/import";

// ─── Field Registry ──────────────────────────────────────────────────────────

export const CUSTOMER_FIELDS: ImportFieldDef[] = [
  {
    key: "name",
    label: "Full Name",
    required: true,
    type: "string",
    maxLength: 200,
    aliases: ["full_name", "fullname", "client_name", "clientname", "customer_name", "customername", "ime", "ime i prezime"],
  },
  {
    key: "email",
    label: "Email",
    required: false,
    type: "email",
    maxLength: 320,
    aliases: ["e-mail", "email_address", "emailaddress", "mail", "e_mail"],
  },
  {
    key: "phone_number",
    label: "Phone",
    required: false,
    type: "phone",
    maxLength: 40,
    aliases: ["phone", "mobile", "telephone", "tel", "cell", "telefon", "mobilni", "mob"],
  },
  {
    key: "marketing_opt_in",
    label: "Marketing Opt-In",
    required: false,
    type: "boolean",
    aliases: ["marketing", "opt_in", "optin", "newsletter", "consent"],
    description: "Accepts: true/yes/1 or false/no/0. Blank = not opted in.",
  },
  {
    key: "tags",
    label: "Tags",
    required: false,
    type: "string",
    maxLength: 500,
    aliases: ["tag", "labels", "categories", "grupe"],
    description: "Comma-separated tags.",
  },
  {
    key: "notes",
    label: "Notes",
    required: false,
    type: "string",
    maxLength: 2000,
    aliases: ["internal_notes", "note", "comment", "napomena", "beleska"],
  },
];

export const CUSTOMER_ADAPTER: ImportAdapter = {
  type: "customers",
  fields: CUSTOMER_FIELDS,
  templateHeaders: ["Full Name", "Email", "Phone", "Marketing Opt-In", "Tags", "Notes"],
};

// ─── Email Validation ────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ─── Boolean Parsing ─────────────────────────────────────────────────────────

function parseBoolean(value: string | undefined | null): boolean | null {
  if (!value || value.trim() === "") return null; // Unknown/blank = null (not opted in)
  const lower = value.trim().toLowerCase();
  if (["true", "yes", "1", "da"].includes(lower)) return true;
  if (["false", "no", "0", "ne"].includes(lower)) return false;
  return null; // Unparseable
}

// ─── Normalization ───────────────────────────────────────────────────────────

export function normalizeCustomerRow(mapped: Record<string, string>): Record<string, unknown> {
  return {
    name: mapped.name?.trim() ?? "",
    email: mapped.email?.trim().toLowerCase() || null,
    phone_number: mapped.phone_number?.trim() || null,
    marketing_opt_in: parseBoolean(mapped.marketing_opt_in) ?? false, // Blank = NOT opted in
    tags: mapped.tags?.trim() || null,
    notes: mapped.notes?.trim() || null,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateCustomerRow(
  mapped: Record<string, string>,
  existingEmails: Set<string>
): RowValidationResult {
  const errorCodes: string[] = [];
  const errorDetails: string[] = [];

  // Required: name
  const name = mapped.name?.trim();
  if (!name) {
    errorCodes.push("required_field_missing");
    errorDetails.push("Full Name is required.");
  }

  // Email validation
  const email = mapped.email?.trim().toLowerCase();
  if (email) {
    if (!EMAIL_REGEX.test(email)) {
      errorCodes.push("invalid_email");
      errorDetails.push(`Invalid email: ${email}`);
    }
  }

  // Phone validation (basic — must have at least 5 chars if provided)
  const phone = mapped.phone_number?.trim();
  if (phone && phone.length < 5) {
    errorCodes.push("invalid_phone");
    errorDetails.push("Phone number too short.");
  }

  // Marketing consent — if invalid boolean format
  const marketingRaw = mapped.marketing_opt_in?.trim();
  if (marketingRaw && marketingRaw !== "" && parseBoolean(marketingRaw) === null) {
    errorCodes.push("invalid_boolean");
    errorDetails.push("Marketing Opt-In must be true/yes/1 or false/no/0.");
  }

  // Field length checks
  if (name && name.length > 200) {
    errorCodes.push("field_too_long");
    errorDetails.push("Name exceeds 200 characters.");
  }

  const matchedEntityId: string | null = null;
  if (email && existingEmails.has(email)) {
    errorCodes.push("duplicate_existing");
    errorDetails.push(`Email already exists: ${email}`);
  }

  if (errorCodes.length > 0) {
    return {
      valid: false,
      errorCodes,
      errorDetails,
      normalizedData: null,
      matchedEntityId,
      action: "invalid",
    };
  }

  const normalizedData = normalizeCustomerRow(mapped);

  return {
    valid: true,
    errorCodes: [],
    errorDetails: [],
    normalizedData,
    matchedEntityId,
    action: "create",
  };
}
