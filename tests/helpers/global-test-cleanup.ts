/**
 * Global Test Cleanup — removes leftover test data from Supabase.
 *
 * Deletes all users with @test.localhost emails and their associated
 * tenant data. Runs as a global teardown after all tests complete,
 * catching anything that per-suite afterAll blocks may have missed
 * (e.g. due to crashes, timeouts, or early exits).
 *
 * Safe to run repeatedly — idempotent by design.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load env when running as a standalone teardown script
config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TEST_EMAIL_DOMAIN = "@test.localhost";

function createAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Global cleanup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function cleanupTestData(): Promise<void> {
  const admin = createAdmin();

  // 1. Find all test users
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (users ?? []).filter(
    (u) => u.email?.endsWith(TEST_EMAIL_DOMAIN)
  );

  if (testUsers.length === 0) {
    console.log("[test-cleanup] No test users found — nothing to clean up.");
    return;
  }

  console.log(`[test-cleanup] Found ${testUsers.length} test user(s) to clean up.`);

  const testUserIds = new Set(testUsers.map((u) => u.id));

  // 2. Find tenants owned by test users (via tenant_members with role=owner)
  const { data: memberships } = await admin
    .from("tenant_members")
    .select("tenant_id, user_id")
    .in("user_id", [...testUserIds])
    .eq("role", "owner");

  const tenantIdsToDelete = new Set(
    (memberships ?? []).map((m: { tenant_id: string }) => m.tenant_id)
  );

  // 3. Delete test tenants (memberships first to avoid last-owner trigger)
  for (const tenantId of tenantIdsToDelete) {
    try {
      await admin.from("tenant_members").delete().eq("tenant_id", tenantId);
      await admin.from("tenants").delete().eq("id", tenantId);
      console.log(`[test-cleanup] Deleted tenant ${tenantId}`);
    } catch (err) {
      console.warn(
        `[test-cleanup] Failed to delete tenant ${tenantId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // 4. Delete all memberships for test users (in case they were staff in non-test tenants)
  for (const userId of testUserIds) {
    try {
      await admin.from("tenant_members").delete().eq("user_id", userId);
    } catch {
      // Ignore — may already be gone via tenant cascade
    }
  }

  // 5. Delete test users from auth.users
  let deleted = 0;
  for (const user of testUsers) {
    try {
      await admin.auth.admin.deleteUser(user.id);
      deleted++;
    } catch (err) {
      console.warn(
        `[test-cleanup] Failed to delete user ${user.email}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(
    `[test-cleanup] Done — deleted ${deleted} user(s), ${tenantIdsToDelete.size} tenant(s).`
  );
}

/**
 * Entry point for vitest globalTeardown and Playwright globalTeardown.
 * Both call the default export function.
 */
export default async function globalTeardown(): Promise<void> {
  await cleanupTestData();
}
