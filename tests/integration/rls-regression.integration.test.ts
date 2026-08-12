import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  assertTestEnvironment,
  createTestAuthenticatedClient,
  setupFullTestEnvironment,
  teardownFullTestEnvironment,
  createTestAppointment,
  type FullTestEnvironment,
} from "../helpers";
import { futureLocalDate } from "../helpers/test-fixtures";

/**
 * RLS Regression & Tenant Isolation — Milestone 13.1, Section 2.
 *
 * Tests REAL Supabase RLS behavior against authenticated clients.
 * Verifies:
 * - No infinite recursion on any tenant-scoped query
 * - Cross-tenant data isolation (Tenant A cannot see Tenant B data)
 * - Unauthenticated access denied
 *
 * Environment: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 */

const hasEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
const describeIntegration = hasEnv ? describe : describe.skip;

describeIntegration("RLS regression & tenant isolation (live DB)", () => {
  let env: FullTestEnvironment;

  beforeAll(async () => {
    assertTestEnvironment();
    env = await setupFullTestEnvironment();

    // Create an appointment in tenant A
    const tomorrow = futureLocalDate(1);
    await createTestAppointment(env.tenantA.tenantId, {
      serviceId: env.serviceA.serviceId,
      resourceId: env.resourceA.resourceId,
      locationId: env.locationA.locationId,
      startsAt: `${tomorrow}T10:00:00Z`,
      endsAt: `${tomorrow}T10:30:00Z`,
      customerName: "RLS Test Customer",
      customerEmail: "rls-test@example.test",
    });
  }, 30_000);

  afterAll(async () => {
    if (env) await teardownFullTestEnvironment(env);
  }, 15_000);

  // ─── No Recursion ───────────────────────────────────────────────────────────

  describe("no infinite recursion", () => {
    it("tenant_members query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data, error } = await client
        .from("tenant_members")
        .select("id, role")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      expect(data).not.toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    });

    it("tenants query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data, error } = await client
        .from("tenants")
        .select("id, name, status")
        .eq("id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      expect(data).not.toBeNull();
      expect(data![0]?.id).toBe(env.tenantA.tenantId);
    });

    it("locations query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data, error } = await client
        .from("locations")
        .select("id, name")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      expect(data).not.toBeNull();
    });

    it("services query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data, error } = await client
        .from("services")
        .select("id, name")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      expect(data).not.toBeNull();
    });

    it("appointments query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data, error } = await client
        .from("appointments")
        .select("id, status")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      expect(data).not.toBeNull();
    });

    it("resources query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data, error } = await client
        .from("resources")
        .select("id, name")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      expect(data).not.toBeNull();
    });

    it("tenant_booking_rules query does not recurse", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { error } = await client
        .from("tenant_booking_rules")
        .select("*")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(error?.message ?? "").not.toContain("infinite recursion");
      // May be empty (no rules set) — that's fine
      expect(error).toBeNull();
    });
  });

  // ─── Cross-Tenant Isolation ─────────────────────────────────────────────────

  describe("cross-tenant isolation", () => {
    it("Owner A cannot see Tenant B data (tenants)", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data } = await client
        .from("tenants")
        .select("id")
        .eq("id", env.tenantB.tenantId);

      expect(data).toEqual([]);
    });

    it("Owner A cannot see Tenant B members", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { data } = await client
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", env.tenantB.tenantId);

      expect(data).toEqual([]);
    });

    it("Owner B cannot see Tenant A locations", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerB.email,
        env.ownerB.password
      );
      const { data } = await client
        .from("locations")
        .select("id")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(data).toEqual([]);
    });

    it("Owner B cannot see Tenant A services", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerB.email,
        env.ownerB.password
      );
      const { data } = await client
        .from("services")
        .select("id")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(data).toEqual([]);
    });

    it("Owner B cannot see Tenant A appointments", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerB.email,
        env.ownerB.password
      );
      const { data } = await client
        .from("appointments")
        .select("id")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(data).toEqual([]);
    });

    it("Owner B cannot see Tenant A resources", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerB.email,
        env.ownerB.password
      );
      const { data } = await client
        .from("resources")
        .select("id")
        .eq("tenant_id", env.tenantA.tenantId);

      expect(data).toEqual([]);
    });

    it("Staff A can see own tenant data but not Tenant B", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.staffA.email,
        env.staffA.password
      );

      // Can see own tenant
      const { data: own } = await client
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", env.tenantA.tenantId);
      expect(own!.length).toBeGreaterThan(0);

      // Cannot see other tenant
      const { data: other } = await client
        .from("tenant_members")
        .select("id")
        .eq("tenant_id", env.tenantB.tenantId);
      expect(other).toEqual([]);
    });
  });

  // ─── Insert Isolation ───────────────────────────────────────────────────────

  describe("insert isolation", () => {
    it("Owner A cannot insert location into Tenant B", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { error } = await client
        .from("locations")
        .insert({
          tenant_id: env.tenantB.tenantId,
          name: "Intruder Location",
          slug: "intruder-loc",
          timezone: "UTC",
          is_active: true,
        });

      expect(error).not.toBeNull();
    });

    it("Owner A cannot insert service into Tenant B", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.ownerA.email,
        env.ownerA.password
      );
      const { error } = await client
        .from("services")
        .insert({
          tenant_id: env.tenantB.tenantId,
          name: "Intruder Service",
          slug: "intruder-svc",
          duration_minutes: 30,
          price: 100,
          currency: "EUR",
          is_active: true,
          sort_order: 0,
        });

      expect(error).not.toBeNull();
    });

    it("Staff cannot insert location (not owner/admin)", async () => {
      const { client } = await createTestAuthenticatedClient(
        env.staffA.email,
        env.staffA.password
      );
      const { error } = await client
        .from("locations")
        .insert({
          tenant_id: env.tenantA.tenantId,
          name: "Staff Location",
          slug: "staff-loc-attempt",
          timezone: "UTC",
          is_active: true,
        });

      expect(error).not.toBeNull();
    });
  });

  // ─── Unauthenticated Access ─────────────────────────────────────────────────

  describe("unauthenticated access", () => {
    it("anon client cannot read tenants", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } }
      );

      const { data } = await anon
        .from("tenants")
        .select("id")
        .eq("id", env.tenantA.tenantId);

      expect(data ?? []).toEqual([]);
    });

    it("anon client cannot read tenant_members", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } }
      );

      const { data } = await anon
        .from("tenant_members")
        .select("id");

      expect(data ?? []).toEqual([]);
    });

    it("anon client cannot read appointments", async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } }
      );

      const { data } = await anon
        .from("appointments")
        .select("id");

      expect(data ?? []).toEqual([]);
    });
  });
});
