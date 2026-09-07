/**
 * Cleanup Test Users — removes @test.localhost accounts and their data.
 *
 * Fixes the Supabase dashboard "Database error deleting user" that happens when
 * a user still owns rows in tables whose FK to auth.users has no cascade
 * (business_media.created_by, location_schedule_exceptions.created_by, both
 * NOT NULL). Those rows are tenant-scoped, so deleting the owned tenant first
 * (which cascades them) unblocks the auth-user delete.
 *
 * Owned tenants are deleted via the delete_tenant_for_test RPC rather than a
 * plain `tenant_members` delete: the tenant_members_prevent_last_owner
 * trigger fires per row even inside a single bulk DELETE, so wiping every
 * member of a tenant still trips it on the owner row (it only sees "0 other
 * active owners" and raises "A tenant must have at least one active owner").
 * The RPC sets the transaction-local `app.deleting_tenant` bypass the trigger
 * checks for before deleting members and the tenant row.
 *
 * Order per test user:
 *   1. Delete owned tenants via delete_tenant_for_test (bypasses the
 *      last-owner trigger, cascades media, schedule exceptions,
 *      appointments, etc.).
 *   2. Delete any remaining memberships in other tenants.
 *   3. Delete the auth.users account.
 *
 * Idempotent and safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-users.ts
 *   npx tsx scripts/cleanup-test-users.ts --domain @test.localhost
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const domainArgIndex = process.argv.indexOf("--domain");
const TEST_EMAIL_DOMAIN =
  domainArgIndex !== -1 ? (process.argv[domainArgIndex + 1] ?? "@test.localhost") : "@test.localhost";

function admin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Cleanup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment."
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main(): Promise<void> {
  const supabase = admin();

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (users ?? []).filter((u) => u.email?.endsWith(TEST_EMAIL_DOMAIN));

  if (testUsers.length === 0) {
    console.log(`[cleanup] No users ending in "${TEST_EMAIL_DOMAIN}" — nothing to do.`);
    return;
  }

  console.log(`[cleanup] Found ${testUsers.length} test user(s) ending in "${TEST_EMAIL_DOMAIN}".`);
  const testUserIds = testUsers.map((u) => u.id);

  // 1. Tenants owned by these test users.
  const { data: ownerMemberships } = await supabase
    .from("tenant_members")
    .select("tenant_id, user_id")
    .in("user_id", testUserIds)
    .eq("role", "owner");

  const ownedTenantIds = [...new Set((ownerMemberships ?? []).map((m) => m.tenant_id as string))];

  for (const tenantId of ownedTenantIds) {
    // Bypasses tenant_members_prevent_last_owner via a transaction-local
    // set_config, then deletes members + tenant (cascades child rows
    // including business_media and location_schedule_exceptions).
    const { data, error: rpcErr } = await supabase.rpc("delete_tenant_for_test", {
      p_tenant_id: tenantId,
    });
    if (rpcErr) {
      console.warn(`[cleanup] Could not delete tenant ${tenantId}: ${rpcErr.message}`);
    } else {
      console.log(`[cleanup] Deleted tenant ${tenantId} (${JSON.stringify(data)})`);
    }
  }

  // 2. Any leftover memberships (e.g. staff in non-test tenants).
  for (const userId of testUserIds) {
    await supabase.from("tenant_members").delete().eq("user_id", userId);
  }

  // 3. Delete the auth users.
  let deleted = 0;
  const failures: Array<{ email: string; message: string }> = [];
  for (const user of testUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      failures.push({ email: user.email ?? user.id, message: error.message });
    } else {
      deleted++;
    }
  }

  console.log(`[cleanup] Deleted ${deleted}/${testUsers.length} user(s) and ${ownedTenantIds.length} tenant(s).`);

  if (failures.length > 0) {
    console.warn(`[cleanup] ${failures.length} user(s) could not be deleted:`);
    for (const f of failures) {
      console.warn(`  - ${f.email}: ${f.message}`);
    }
    console.warn(
      "[cleanup] Remaining failures usually mean a row still references the user " +
      "in a non-tenant-scoped table. Re-run after inspecting, or clear that row manually."
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[cleanup] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
