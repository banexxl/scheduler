/**
 * JSON-LD Structured Data Builder — Milestone 15.13.
 *
 * Generates schema.org structured data for public tenant pages.
 * Server-side only — rendered into <script type="application/ld+json">.
 *
 * Supported types:
 * - LocalBusiness (homepage)
 * - Service (service detail pages)
 * - FAQPage (when FAQ section enabled)
 * - AggregateRating (when reviews exist)
 *
 * Rules:
 * - Only include fields actually known (never fabricate)
 * - Never include internal IDs, private data, or draft content
 * - No executable content in JSON-LD output
 * - Use conservative schema.org types (no highly specific business subtypes)
 */

import type {
  PublicTenantInfo,
  PublicLocationItem,
  PublicReviewData,
} from "../services/public-site-resolver";

// ─── Base URL Helper ─────────────────────────────────────────────────────────

function getPublicBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://get-slot.app";
}

// ─── LocalBusiness ───────────────────────────────────────────────────────────

type LocalBusinessInput = {
  tenant: PublicTenantInfo;
  locations: PublicLocationItem[];
  reviews: PublicReviewData;
  tenantSlug: string;
};

/**
 * Generates LocalBusiness JSON-LD for the homepage.
 */
export function buildLocalBusinessJsonLd(input: LocalBusinessInput): Record<string, unknown> {
  const { tenant, locations, reviews, tenantSlug } = input;
  const baseUrl = getPublicBaseUrl();
  const primaryLocation = locations.find(l => l.isPrimary) ?? locations[0];

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: tenant.name,
    url: `${baseUrl}/book/${tenantSlug}`,
  };

  if (tenant.description) {
    jsonLd.description = tenant.description;
  }

  // Address from primary location
  if (primaryLocation) {
    const address: Record<string, unknown> = {
      "@type": "PostalAddress",
    };
    if (primaryLocation.streetAddress) address.streetAddress = primaryLocation.streetAddress;
    if (primaryLocation.city) address.addressLocality = primaryLocation.city;
    if (primaryLocation.provinceState) address.addressRegion = primaryLocation.provinceState;
    if (primaryLocation.postalCode) address.postalCode = primaryLocation.postalCode;
    if (primaryLocation.country) address.addressCountry = primaryLocation.country;

    jsonLd.address = address;

    if (primaryLocation.phoneNumber) {
      jsonLd.telephone = primaryLocation.phoneNumber;
    }
    if (primaryLocation.email) {
      jsonLd.email = primaryLocation.email;
    }
    if (primaryLocation.latitude && primaryLocation.longitude) {
      jsonLd.geo = {
        "@type": "GeoCoordinates",
        latitude: primaryLocation.latitude,
        longitude: primaryLocation.longitude,
      };
    }
  }

  // Aggregate rating (only if canonical reviews exist)
  if (reviews.summary && reviews.summary.count > 0 && reviews.summary.averageRating) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviews.summary.averageRating,
      reviewCount: reviews.summary.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

// ─── Service ─────────────────────────────────────────────────────────────────

type ServiceJsonLdInput = {
  service: { name: string; description: string | null; price: string; currency: string; durationMinutes: number };
  tenantName: string;
  tenantSlug: string;
  serviceSlug: string;
};

/**
 * Generates Service JSON-LD for service detail pages.
 */
export function buildServiceJsonLd(input: ServiceJsonLdInput): Record<string, unknown> {
  const { service, tenantName, tenantSlug, serviceSlug } = input;
  const baseUrl = getPublicBaseUrl();

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    provider: {
      "@type": "LocalBusiness",
      name: tenantName,
    },
    url: `${baseUrl}/book/${tenantSlug}/services/${serviceSlug}`,
  };

  if (service.description) {
    jsonLd.description = service.description;
  }

  const price = Number(service.price);
  if (price > 0) {
    jsonLd.offers = {
      "@type": "Offer",
      price: service.price,
      priceCurrency: service.currency,
      availability: "https://schema.org/InStock",
    };
  }

  return jsonLd;
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

/**
 * Generates FAQPage JSON-LD when FAQ entries exist.
 * Only includes entries with both question and answer.
 */
export function buildFaqJsonLd(faq: Array<{ question: string; answer: string }>): Record<string, unknown> | null {
  const validEntries = faq.filter(f => f.question.trim() && f.answer.trim());
  if (validEntries.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: validEntries.map(entry => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

// ─── Render Helper ───────────────────────────────────────────────────────────

/**
 * Renders JSON-LD as a safe script tag string for embedding in head/body.
 * Content is JSON.stringify'd — no raw HTML possible.
 */
export function renderJsonLdScript(data: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
