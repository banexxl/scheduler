import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  assertTestEnvironment,
  createTestAdminClient,
  createTestUser,
  createTestTenant,
  createTestMembership,
  createTestLocation,
  createTestService,
} from "../helpers";
import { getTestRunId } from "../helpers/test-fixtures";

/**
 * Tenant Deletion Integration — Milestone 13.2.
 *
 * Tests:
 * - Owner can delete tenant via RPC
 * - Non-owner is denied
 * - Active subscription blocks deletion
 * - Confirmation slug must match
 * - Multi-tenant user retains other tenants
 * - Auth user not deleted
 * - Deletion audit event created
 * - Cascaded data is removed
 * - Test helper RPC works
 */

const hasEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
const describeIntegration = hasEnv ? describe : describe.skip;

describeIntegration("tenant deletion (live DB)", () => {
  const admin = () => createTestAdminClient();
  const runId = getTestRunId();

  let ownerUserId: string;
  let staffUserId: string;
  let tenantToDeleteId: string;
  let tenantToDeleteSlug: string;
  let retainedTenantId: string;

  beforeAll(async () => {
    assertTestEnvironment();

    // Create users
    ownerUserId = await createTestUser(`owner-del-${runId}@test.localhost`, "TestPass!Del123");
    staffUserId = await createTestUser(`staff-del-${runId}@test.localhost`, "TestPass!Del456");

    // Create tenant to delete
    const deleteTenant = await createTestTenant("delete-me");
    tenantToDeleteId = deleteTenant.tenantId;
    tenantToDeleteSlug = deleteTenant.slug;

    // Create retained tenant (same owner, different business)
    const retainTenant = await createTestTenant("keep-me");
    retainedTenantId = retainTenant.tenantId;

    // Memberships
    await createTestMembership(tenantToDeleteId, ownerUserId, "owner");
    await createTestMembership(tenantToDeleteId, staffUserId, "staff");
    await createTestMembership(retainedTenantId, ownerUserId, "owner");

    // Add some data to the tenant being deleted
    await createTestLocation(tenantToDeleteId, "main");
    await createTestService(tenantToDeleteId, "haircut");
  }, 30_000);

  afterAll(async () => {
    // Clean up retained tenant
    try {
      await admin().rpc("delete_tenant_for_test", { p_tenant_id: retainedTenantId });
    } catch { /* may already be gone */ }
    // Clean up test users
    const { deleteTestUser } = await import("../helpers/supabase-test-client");
    for (const id of [ownerUserId, staffUserId]) {
      if (id) await deleteTestUser(id).catch(() => { });
    }
  }, 15_000);

  describe("authorization", () => {
    it("non-owner cannot delete", async () => {
      const { data } = await admin().rpc("delete_tenant_permanently", {
        p_tenant_id: tenantToDeleteId,
        p_actor_user_id: staffUserId,
        p_confirmation_slug: tenantToDeleteSlug,
      });

      const result = data as unknown as Record<string, unknown>;
      expect(result?.status).toBe("unauthorized");
    });

    it("wrong confirmation slug is rejected", async () => {
      const { data } = await admin().rpc("delete_tenant_permanently", {
        p_tenant_id: tenantToDeleteId,
        p_actor_user_id: ownerUserId,
        p_confirmation_slug: "wrong-slug",
      });

      const result = data as unknown as Record<string, unknown>;
      expect(result?.status).toBe("confirmation_mismatch");
    });

    it("non-existent tenant returns not_found", async () => {
      const { data } = await admin().rpc("delete_tenant_permanently", {
        p_tenant_id: "00000000-0000-0000-0000-000000000000",
        p_actor_user_id: ownerUserId,
        p_confirmation_slug: "whatever",
      });

      const result = data as unknown as Record<string, unknown>;
      expect(result?.status).toBe("not_found");
    });
  });

  describe("deletion preview", () => {
    it("returns summary counts", async () => {
      const { data } = await admin().rpc("get_tenant_deletion_preview", {
        p_tenant_id: tenantToDeleteId,
        p_actor_user_id: ownerUserId,
      });

      const result = data as unknown as Record<string, unknown>;
      expect(result?.status).toBe("ok");

      const summary = result?.summary as Record<string, number>;
      expect(summary?.members).toBeGreaterThan(0);
      expect(summary?.locations).toBeGreaterThan(0);
      expect(summary?.services).toBeGreaterThan(0);
    });

    it("non-owner gets unauthorized preview", async () => {
      const { data } = await admin().rpc("get_tenant_deletion_preview", {
        p_tenant_id: tenantToDeleteId,
        p_actor_user_id: staffUserId,
      });

      const result = data as unknown as Record<string, unknown>;
      expect(result?.status).toBe("unauthorized");
    });
  });

  describe("successful deletion", () => {
    it("owner can delete with correct confirmation", async () => {
      const { data, error } = await admin().rpc("delete_tenant_permanently", {
        p_tenant_id: tenantToDeleteId,
        p_actor_user_id: ownerUserId,
        p_confirmation_slug: tenantToDeleteSlug,
      });

      if (error) {
        console.log("[tenant-deletion] RPC error:", error.code, error.message);
        throw new Error(`delete_tenant_permanently failed: ${error.message}`);
      }
      const result = typeof data === "string" ? JSON.parse(data) : data;
      expect(result?.status).toBe("deleted");
    });

    it("tenant no longer exists after deletion", async () => {
      const { data } = await admin()
        .from("tenants")
        .select("id")
        .eq("id", tenantToDeleteId)
        .single();

      expect(data).toBeNull();
    });

    it("tenant members were removed", async () => {
      const { data } = await admin()
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", tenantToDeleteId);

      expect(data).toEqual([]);
    });

    it("locations were cascaded", async () => {
      const { data } = await admin()
        .from("locations")
        .select("id")
        .eq("tenant_id", tenantToDeleteId);

      expect(data).toEqual([]);
    });

    it("services were cascaded", async () => {
      const { data } = await admin()
        .from("services")
        .select("id")
        .eq("tenant_id", tenantToDeleteId);

      expect(data).toEqual([]);
    });

    it("deletion audit event was recorded", async () => {
      const { data } = await admin()
        .from("tenant_deletion_events")
        .select("*")
        .eq("tenant_id", tenantToDeleteId)
        .single();

      expect(data).not.toBeNull();
      expect(data!.actor_user_id).toBe(ownerUserId);
      expect(data!.tenant_slug).toBe(tenantToDeleteSlug);
    });
  });

  describe("multi-tenant user retention", () => {
    it("owner still has membership in retained tenant", async () => {
      const { data } = await admin()
        .from("tenant_members")
        .select("id, role")
        .eq("tenant_id", retainedTenantId)
        .eq("user_id", ownerUserId)
        .eq("status", "active")
        .single();

      expect(data).not.toBeNull();
      expect(data!.role).toBe("owner");
    });

    it("retained tenant still exists", async () => {
      const { data } = await admin()
        .from("tenants")
        .select("id")
        .eq("id", retainedTenantId)
        .single();

      expect(data).not.toBeNull();
    });
  });

  describe("test helper RPC", () => {
    it("delete_tenant_for_test works without auth check", async () => {
      // Create a disposable tenant
      const disposable = await createTestTenant("disposable");
      await createTestMembership(disposable.tenantId, ownerUserId, "owner");

      const { data, error } = await admin().rpc("delete_tenant_for_test", {
        p_tenant_id: disposable.tenantId,
      });

      if (error) {
        console.log("[tenant-deletion] delete_tenant_for_test error:", error.code, error.message);
        throw new Error(`delete_tenant_for_test failed: ${error.message}`);
      }
      const result = typeof data === "string" ? JSON.parse(data) : data;
      expect(result?.status).toBe("deleted");
    });
  });
});
