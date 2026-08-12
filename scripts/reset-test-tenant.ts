/**
 * Dev/Test Tenant Reset — Milestone 13.2.
 *
 * Safely deletes a test tenant and optionally its auth users.
 * Uses the delete_tenant_for_test RPC (service-role only).
 *
 * Usage:
 *   npx tsx scripts/reset-test-tenant.ts <tenant-slug-or-id>
 *   npx tsx scripts/reset-test-tenant.ts --all-test
 *
 * Flags:
 *   --delete-users    Also delete auth users (only for test-prefixed emails)
 *
 * Safety:
 *   - Refuses production URLs
 *   - Only operates on tenants matching test patterns
 */

import { createClient } from "@supabase/supabase-js";

// ─── Environment ─────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// ─── Production Guard ────────────────────────────────────────────────────────

const PRODUCTION_PATTERNS = ["scheduler.com", "scheduler.io", "production", "prod."];

function assertNotProduction(): void {
  for (const pattern of PRODUCTION_PATTERNS) {
    if (SUPABASE_URL.includes(pattern) || APP_URL.includes(pattern)) {
      console.error(`ABORTED: Production URL pattern detected ("${pattern}").`);
      console.error("This script cannot run against production.");
      process.exit(1);
    }
  }
}

// ─── Client ──────────────────────────────────────────────────────────────────

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  assertNotProduction();

  const args = process.argv.slice(2);
  const deleteUsers = args.includes("--delete-users");
  const allTest = args.includes("--all-test");
  const slugOrId = args.find((a) => !a.startsWith("--"));

  if (!allTest && !slugOrId) {
    console.log("Usage:");
    console.log("  npx tsx scripts/reset-test-tenant.ts <slug-or-id>");
    console.log("  npx tsx scripts/reset-test-tenant.ts --all-test");
    console.log("  npx tsx scripts/reset-test-tenant.ts <slug> --delete-users");
    process.exit(0);
  }

  const admin = getAdminClient();

  // Find target tenants
  let tenants: { id: string; slug: string; name: string }[] = [];

  if (allTest) {
    const { data } = await admin
      .from("tenants")
      .select("id, slug, name")
      .or("slug.like.test-%,slug.like.e2e-%");
    tenants = data ?? [];
  } else if (slugOrId) {
    // Try by slug first, then by ID
    const { data: bySlug } = await admin
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", slugOrId)
      .single();

    if (bySlug) {
      tenants = [bySlug];
    } else {
      const { data: byId } = await admin
        .from("tenants")
        .select("id, slug, name")
        .eq("id", slugOrId)
        .single();
      if (byId) tenants = [byId];
    }
  }

  if (tenants.length === 0) {
    console.log("No matching tenants found.");
    process.exit(0);
  }

  console.log(`Found ${tenants.length} tenant(s) to delete:`);
  for (const t of tenants) {
    console.log(`  - ${t.slug} (${t.name}) [${t.id}]`);
  }
  console.log("");

  // Delete each tenant using the RPC
  for (const tenant of tenants) {
    console.log(`Deleting "${tenant.slug}"...`);

    // Collect user IDs before deletion (for optional user cleanup)
    let memberUserIds: string[] = [];
    if (deleteUsers) {
      const { data: members } = await admin
        .from("tenant_members")
        .select("user_id")
        .eq("tenant_id", tenant.id);
      memberUserIds = (members ?? []).map((m) => m.user_id);
    }

    // Call the test-only RPC
    const { data, error } = await admin.rpc("delete_tenant_for_test", {
      p_tenant_id: tenant.id,
    });

    if (error) {
      console.error(`  FAILED: ${error.message}`);
      continue;
    }

    const result = data as unknown as Record<string, unknown>;
    console.log(`  ${result?.status ?? "done"}`);

    // Optional user cleanup
    if (deleteUsers && memberUserIds.length > 0) {
      for (const userId of memberUserIds) {
        // Only delete users with test-pattern emails
        const { data: { user } } = await admin.auth.admin.getUserById(userId);
        if (!user) continue;

        const email = user.email ?? "";
        const isTestUser =
          email.includes("@test.localhost") ||
          email.includes("+e2e") ||
          email.includes("+test") ||
          email.startsWith("test-");

        if (isTestUser) {
          // Check if user has other active memberships
          const { data: otherMemberships } = await admin
            .from("tenant_members")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "active")
            .limit(1);

          if ((otherMemberships ?? []).length === 0) {
            await admin.auth.admin.deleteUser(userId);
            console.log(`  Deleted user: ${email}`);
          } else {
            console.log(`  Kept user (has other memberships): ${email}`);
          }
        }
      }
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
