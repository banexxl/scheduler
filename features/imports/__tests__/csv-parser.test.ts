import { describe, it, expect } from "vitest";
import { parseCSV, validateCSVFile, escapeCsvCell, generateTemplate } from "../services/csv-parser";
import { autoMapHeaders, validateMapping, applyMapping } from "../services/field-mapping";
import { CUSTOMER_FIELDS, normalizeCustomerRow, validateCustomerRow } from "../adapters/customer-adapter";

/**
 * Import System Unit Tests — Milestone 15.10.
 */

describe("CSV parser", () => {
  it("parses basic CSV with headers", () => {
    const csv = "Name,Email\nAna,ana@test.com\nMarko,marko@test.com";
    const result = parseCSV(csv);
    expect(result.headers).toEqual(["Name", "Email"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]!.Name).toBe("Ana");
  });

  it("handles BOM", () => {
    const csv = "\uFEFFName,Email\nTest,test@test.com";
    const result = parseCSV(csv);
    expect(result.headers[0]).toBe("Name");
  });

  it("handles quoted commas", () => {
    const csv = 'Name,Address\n"Smith, John","123 Main St, City"';
    const result = parseCSV(csv);
    expect(result.rows[0]!.Name).toBe("Smith, John");
    expect(result.rows[0]!.Address).toBe("123 Main St, City");
  });

  it("handles escaped quotes", () => {
    const csv = 'Name,Note\n"Ana ""Ace"" P","note"';
    const result = parseCSV(csv);
    expect(result.rows[0]!.Name).toBe('Ana "Ace" P');
  });

  it("trims header whitespace", () => {
    const csv = " Name , Email \nAna,ana@test.com";
    const result = parseCSV(csv);
    expect(result.headers).toEqual(["Name", "Email"]);
  });

  it("skips empty lines", () => {
    const csv = "Name\nAna\n\nMarko\n";
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });

  it("enforces row limit in errors", () => {
    const headers = "Name";
    const rows = Array(10001).fill("Test").join("\n");
    const csv = `${headers}\n${rows}`;
    const result = parseCSV(csv);
    expect(result.errors.some((e) => e.includes("Too many rows"))).toBe(true);
  });
});

describe("CSV validation", () => {
  it("rejects oversized files", () => {
    const result = validateCSVFile("x", 11 * 1024 * 1024);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("10 MB");
  });

  it("rejects empty content", () => {
    const result = validateCSVFile("", 0);
    expect(result.valid).toBe(false);
  });

  it("accepts valid CSV", () => {
    const result = validateCSVFile("Name,Email\nAna,ana@test.com", 50);
    expect(result.valid).toBe(true);
    expect(result.rowCount).toBe(1);
  });
});

describe("CSV cell escaping (formula injection)", () => {
  it("escapes cells starting with =", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
  });

  it("escapes cells starting with +", () => {
    expect(escapeCsvCell("+123")).toBe("'+123");
  });

  it("escapes cells starting with -", () => {
    expect(escapeCsvCell("-cmd")).toBe("'-cmd");
  });

  it("escapes cells starting with @", () => {
    expect(escapeCsvCell("@import")).toBe("'@import");
  });

  it("quotes cells with commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("leaves normal cells unchanged", () => {
    expect(escapeCsvCell("Ana Petrovic")).toBe("Ana Petrovic");
  });
});

describe("template generation", () => {
  it("generates header-only template", () => {
    const csv = generateTemplate(["Name", "Email"]);
    expect(csv).toBe("Name,Email\n");
  });

  it("generates template with example row", () => {
    const csv = generateTemplate(["Name", "Email"], { Name: "Ana P", Email: "ana@example.com" });
    expect(csv).toContain("Ana P");
  });
});

describe("field mapping", () => {
  it("auto-maps exact matches", () => {
    const result = autoMapHeaders(["email", "name"], CUSTOMER_FIELDS);
    expect(result["email"]).toBe("email");
    expect(result["name"]).toBe("name");
  });

  it("auto-maps aliases", () => {
    const result = autoMapHeaders(["E-mail Address", "Client Name", "Mobile"], CUSTOMER_FIELDS);
    expect(result["E-mail Address"]).toBe("email");
    expect(result["Client Name"]).toBe("name");
    expect(result["Mobile"]).toBe("phone_number");
  });

  it("validates required fields", () => {
    const mapping = { "Col1": "email" }; // Missing name
    const result = validateMapping(mapping, CUSTOMER_FIELDS);
    expect(result.valid).toBe(false);
    expect(result.missingRequired).toContain("Full Name");
  });

  it("applies mapping to row", () => {
    const raw = { "Client Name": "Ana", "E-mail": "ana@test.com" };
    const mapping = { "Client Name": "name", "E-mail": "email" };
    const result = applyMapping(raw, mapping);
    expect(result.name).toBe("Ana");
    expect(result.email).toBe("ana@test.com");
  });
});

describe("customer normalization", () => {
  it("trims and lowercases email", () => {
    const result = normalizeCustomerRow({ name: "Ana", email: " ANA@Test.COM ", phone_number: "", marketing_opt_in: "" });
    expect(result.email).toBe("ana@test.com");
  });

  it("blank marketing opt-in = false", () => {
    const result = normalizeCustomerRow({ name: "Ana", email: "", phone_number: "", marketing_opt_in: "" });
    expect(result.marketing_opt_in).toBe(false);
  });

  it("explicit true marketing opt-in", () => {
    const result = normalizeCustomerRow({ name: "Ana", email: "", phone_number: "", marketing_opt_in: "yes" });
    expect(result.marketing_opt_in).toBe(true);
  });
});

describe("customer validation", () => {
  it("requires name", () => {
    const result = validateCustomerRow({ name: "", email: "a@b.com", phone_number: "", marketing_opt_in: "" }, new Set());
    expect(result.valid).toBe(false);
    expect(result.errorCodes).toContain("required_field_missing");
  });

  it("validates email format", () => {
    const result = validateCustomerRow({ name: "Ana", email: "not-email", phone_number: "", marketing_opt_in: "" }, new Set());
    expect(result.valid).toBe(false);
    expect(result.errorCodes).toContain("invalid_email");
  });

  it("detects existing duplicate email", () => {
    const existing = new Set(["ana@test.com"]);
    const result = validateCustomerRow({ name: "Ana", email: "ana@test.com", phone_number: "", marketing_opt_in: "" }, existing);
    expect(result.valid).toBe(false);
    expect(result.errorCodes).toContain("duplicate_existing");
  });

  it("passes valid customer", () => {
    const result = validateCustomerRow({ name: "Ana Petrovic", email: "ana@new.com", phone_number: "+381641234567", marketing_opt_in: "true" }, new Set());
    expect(result.valid).toBe(true);
    expect(result.action).toBe("create");
  });

  it("does not infer consent from email presence", () => {
    const result = validateCustomerRow({ name: "Test", email: "test@test.com", phone_number: "", marketing_opt_in: "" }, new Set());
    expect(result.valid).toBe(true);
    expect(result.normalizedData!.marketing_opt_in).toBe(false);
  });
});
