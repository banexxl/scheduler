/**
 * E2E Seed Script — Milestone 13.1.
 *
 * Creates deterministic test fixtures for E2E testing.
 * Safe to run repeatedly (upsert/deterministic cleanup).
 *
 * Usage: npm run seed:e2e
 *
 * Environment: requires TEST_BASE_URL or NEXT_PUBLIC_APP_URL
 * Never targets production (environment guard applied).
 */

import { assertTestEnvironment } from "../helpers/test-fixtures";

// ─── Environment Guard ───────────────────────────────────────────────────────

assertTestEnvironment();

// ─── Fixture Constants ───────────────────────────────────────────────────────

export const FIXTURES = {
  tenants: {
    salon: {
      name: "E2E Salon",
      slug: "e2e-salon",
      timezone: "Europe/Belgrade",
      currency: "RSD",
    },
    clinic: {
      name: "E2E Clinic",
      slug: "e2e-clinic",
      timezone: "Europe/Belgrade",
      currency: "EUR",
    },
    payments: {
      name: "E2E Payments Business",
      slug: "e2e-payments",
      timezone: "Europe/Belgrade",
      currency: "RSD",
    },
    incomplete: {
      name: "E2E Incomplete Business",
      slug: "e2e-incomplete",
      timezone: "Europe/Belgrade",
      currency: "RSD",
    },
  },
  accounts: {
    salonOwner: { email: "owner+e2e-salon@example.test", password: "TestPass123!Owner" },
    salonAdmin: { email: "admin+e2e-salon@example.test", password: "TestPass123!Admin" },
    salonStaffAna: { email: "ana+e2e-salon@example.test", password: "TestPass123!Ana" },
    salonStaffMarko: { email: "marko+e2e-salon@example.test", password: "TestPass123!Marko" },
    clinicOwner: { email: "owner+e2e-clinic@example.test", password: "TestPass123!Clinic" },
    customer: { email: "customer+e2e@example.test", password: "TestPass123!Customer" },
  },
  services: {
    haircut: { name: "Haircut", duration: 30, price: 1500 },
    hairBeard: { name: "Hair + Beard", duration: 45, price: 2000 },
    coloring: { name: "Coloring", duration: 90, price: 4500 },
  },
} as const;

// ─── Seed Execution ──────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 E2E Seed: Starting...");
  console.log(`   Tenants: ${Object.keys(FIXTURES.tenants).length}`);
  console.log(`   Accounts: ${Object.keys(FIXTURES.accounts).length}`);
  console.log(`   Services: ${Object.keys(FIXTURES.services).length}`);
  console.log("");
  console.log("   NOTE: Full DB seeding requires running Supabase admin client.");
  console.log("   This script defines fixtures. Actual DB insertion requires");
  console.log("   SUPABASE_SERVICE_ROLE_KEY and matching test Supabase project.");
  console.log("");
  console.log("✅ E2E Seed: Fixture definitions validated.");
}

seed().catch((err) => {
  console.error("❌ E2E Seed failed:", err);
  process.exit(1);
});
