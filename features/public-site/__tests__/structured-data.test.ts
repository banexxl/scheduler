/**
 * Structured Data (JSON-LD) Unit Tests — Milestone 15.13.
 */

import { describe, it, expect } from "vitest";
import { buildLocalBusinessJsonLd, buildServiceJsonLd, buildFaqJsonLd } from "../utils/structured-data";

describe("buildLocalBusinessJsonLd", () => {
  const baseTenant = { id: "t1", slug: "acme", name: "Acme Spa", description: "A spa", timeZone: "UTC", socialLinks: [] };

  it("generates valid LocalBusiness schema", () => {
    const result = buildLocalBusinessJsonLd({
      tenant: baseTenant,
      locations: [],
      reviews: { reviews: [], summary: null },
      tenantSlug: "acme",
    });

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("LocalBusiness");
    expect(result.name).toBe("Acme Spa");
  });

  it("includes address from primary location", () => {
    const result = buildLocalBusinessJsonLd({
      tenant: baseTenant,
      locations: [{
        id: "l1", name: "Main", slug: "main", description: null,
        streetAddress: "123 Main St", city: "Springfield", provinceState: "IL",
        postalCode: "62701", country: "US",
        latitude: 39.78, longitude: -89.65,
        phoneNumber: "+1-555-0100", email: "info@acme.com",
        timezone: "America/Chicago", isPrimary: true, sortOrder: 0,
      }],
      reviews: { reviews: [], summary: null },
      tenantSlug: "acme",
    });

    expect(result.address).toBeDefined();
    const address = result.address as Record<string, unknown>;
    expect(address["@type"]).toBe("PostalAddress");
    expect(address.streetAddress).toBe("123 Main St");
    expect(address.addressLocality).toBe("Springfield");
    expect(result.telephone).toBe("+1-555-0100");
    expect(result.geo).toBeDefined();
  });

  it("includes aggregateRating when reviews exist", () => {
    const result = buildLocalBusinessJsonLd({
      tenant: baseTenant,
      locations: [],
      reviews: { reviews: [], summary: { count: 42, averageRating: 4.5, ratingDistribution: {} } },
      tenantSlug: "acme",
    });

    expect(result.aggregateRating).toBeDefined();
    const rating = result.aggregateRating as Record<string, unknown>;
    expect(rating["@type"]).toBe("AggregateRating");
    expect(rating.ratingValue).toBe(4.5);
    expect(rating.reviewCount).toBe(42);
  });

  it("omits aggregateRating when no reviews", () => {
    const result = buildLocalBusinessJsonLd({
      tenant: baseTenant,
      locations: [],
      reviews: { reviews: [], summary: null },
      tenantSlug: "acme",
    });

    expect(result.aggregateRating).toBeUndefined();
  });

  it("does not fabricate data", () => {
    const result = buildLocalBusinessJsonLd({
      tenant: { ...baseTenant, description: null },
      locations: [],
      reviews: { reviews: [], summary: null },
      tenantSlug: "acme",
    });

    expect(result.description).toBeUndefined();
    expect(result.address).toBeUndefined();
    expect(result.telephone).toBeUndefined();
  });
});

describe("buildServiceJsonLd", () => {
  it("generates valid Service schema", () => {
    const result = buildServiceJsonLd({
      service: { name: "Massage", description: "60min relaxation", price: "50.00", currency: "USD", durationMinutes: 60 },
      tenantName: "Acme Spa",
      tenantSlug: "acme",
      serviceSlug: "massage",
    });

    expect(result["@context"]).toBe("https://schema.org");
    expect(result["@type"]).toBe("Service");
    expect(result.name).toBe("Massage");
    expect(result.description).toBe("60min relaxation");
    expect(result.offers).toBeDefined();
    const offers = result.offers as Record<string, unknown>;
    expect(offers.price).toBe("50.00");
    expect(offers.priceCurrency).toBe("USD");
  });

  it("omits offers for free services", () => {
    const result = buildServiceJsonLd({
      service: { name: "Consult", description: null, price: "0", currency: "USD", durationMinutes: 15 },
      tenantName: "Acme",
      tenantSlug: "acme",
      serviceSlug: "consult",
    });

    expect(result.offers).toBeUndefined();
  });
});

describe("buildFaqJsonLd", () => {
  it("generates FAQPage schema", () => {
    const result = buildFaqJsonLd([
      { question: "What time do you open?", answer: "We open at 9am." },
      { question: "Do you accept walk-ins?", answer: "Yes, walk-ins welcome." },
    ]);

    expect(result).not.toBeNull();
    expect(result!["@type"]).toBe("FAQPage");
    const entities = result!.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(2);
    expect(entities[0]!["@type"]).toBe("Question");
    expect(entities[0]!.name).toBe("What time do you open?");
  });

  it("returns null for empty FAQ", () => {
    expect(buildFaqJsonLd([])).toBeNull();
  });

  it("skips entries with empty question or answer", () => {
    const result = buildFaqJsonLd([
      { question: "Valid?", answer: "Yes" },
      { question: "", answer: "No question" },
      { question: "No answer", answer: "  " },
    ]);

    expect(result).not.toBeNull();
    const entities = result!.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
  });
});
