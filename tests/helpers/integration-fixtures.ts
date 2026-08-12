/**
 * Integration Test Fixtures — Milestone 13.1.
 *
 * Provides deterministic, reusable test data for integration tests.
 * Uses service-role client for setup, authenticated clients for validation.
 *
 * Strategy:
 * - Each test suite gets a unique run prefix to avoid collision
 * - Fixtures create real DB rows (tenants, members, services, etc.)
 * - Teardown removes test-specific data by matching the run prefix
 */

import { createTestAdminClient, createTestUser } from "./supabase-test-client";
import { getTestRunId } from "./test-fixtures";

// ─── Tenant Fixture ──────────────────────────────────────────────────────────

export type TestTenantFixture = {
  tenantId: string;
  slug: string;
  name: string;
};

export async function createTestTenant(
  label: string,
  status: "active" | "trialing" = "active"
): Promise<TestTenantFixture> {
  const admin = createTestAdminClient();
  const runId = getTestRunId();
  // Slug must be lowercase alphanumeric + hyphens only (no underscores)
  const rawSlug = `test-${label}-${runId}`.slice(0, 60).toLowerCase();
  const slug = rawSlug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const name = `Test ${label} ${runId.slice(0, 8)}`;

  const { data, error } = await admin
    .from("tenants")
    .insert({
      name,
      slug,
      status,
      default_timezone: "Europe/Belgrade",
      default_currency: "EUR",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test tenant "${label}": ${error.message}`);

  return { tenantId: data.id, slug, name };
}

// ─── Membership Fixture ──────────────────────────────────────────────────────

export type TestMemberFixture = {
  membershipId: string;
  userId: string;
  role: string;
};

export async function createTestMembership(
  tenantId: string,
  userId: string,
  role: "owner" | "admin" | "manager" | "staff" = "owner"
): Promise<TestMemberFixture> {
  const admin = createTestAdminClient();

  const { data, error } = await admin
    .from("tenant_members")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create membership: ${error.message}`);

  return { membershipId: data.id, userId, role };
}

// ─── Location Fixture ────────────────────────────────────────────────────────

export type TestLocationFixture = {
  locationId: string;
  slug: string;
  name: string;
};

export async function createTestLocation(
  tenantId: string,
  label: string
): Promise<TestLocationFixture> {
  const admin = createTestAdminClient();
  const runId = getTestRunId();
  const slug = `loc-${label}-${runId}`.slice(0, 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const name = `Location ${label}`;

  const { data, error } = await admin
    .from("locations")
    .insert({
      tenant_id: tenantId,
      name,
      slug,
      timezone: "Europe/Belgrade",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test location: ${error.message}`);

  return { locationId: data.id, slug, name };
}

// ─── Service Fixture ─────────────────────────────────────────────────────────

export type TestServiceFixture = {
  serviceId: string;
  slug: string;
  name: string;
};

export async function createTestService(
  tenantId: string,
  label: string,
  options?: { durationMinutes?: number; price?: number; currency?: string }
): Promise<TestServiceFixture> {
  const admin = createTestAdminClient();
  const runId = getTestRunId();
  const slug = `svc-${label}-${runId}`.slice(0, 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const name = `Service ${label}`;

  const { data, error } = await admin
    .from("services")
    .insert({
      tenant_id: tenantId,
      name,
      slug,
      duration_minutes: options?.durationMinutes ?? 30,
      price: options?.price ?? 1000,
      currency: options?.currency ?? "EUR",
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test service: ${error.message}`);

  return { serviceId: data.id, slug, name };
}

// ─── Resource Fixture ────────────────────────────────────────────────────────

export type TestResourceFixture = {
  resourceId: string;
  slug: string;
  name: string;
};

export async function createTestResource(
  tenantId: string,
  label: string,
  resourceTypeId: string
): Promise<TestResourceFixture> {
  const admin = createTestAdminClient();
  const runId = getTestRunId();
  const slug = `res-${label}-${runId}`.slice(0, 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const name = `Resource ${label}`;

  const { data, error } = await admin
    .from("resources")
    .insert({
      tenant_id: tenantId,
      resource_type_id: resourceTypeId,
      name,
      slug,
      is_active: true,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test resource: ${error.message}`);

  return { resourceId: data.id, slug, name };
}

// ─── Resource Type Fixture ───────────────────────────────────────────────────

export async function createTestResourceType(
  tenantId: string,
  label: string
): Promise<string> {
  const admin = createTestAdminClient();
  const runId = getTestRunId();
  const slug = `rtype-${label}-${runId}`.slice(0, 60).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");

  const { data, error } = await admin
    .from("resource_types")
    .insert({
      tenant_id: tenantId,
      name: `Type ${label}`,
      slug,
      sort_order: 0,
      resource_kind: "person",
      display_name_singular: `${label}`,
      display_name_plural: `${label}s`,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create test resource type: ${error.message}`);
  return data.id;
}

// ─── Appointment Fixture ─────────────────────────────────────────────────────

export type TestAppointmentFixture = {
  appointmentId: string;
  status: string;
};

export async function createTestAppointment(
  tenantId: string,
  options: {
    serviceId: string;
    resourceId: string;
    locationId: string;
    startsAt: string;
    endsAt: string;
    customerName?: string;
    customerEmail?: string;
    customerId?: string;
    status?: string;
  }
): Promise<TestAppointmentFixture> {
  const admin = createTestAdminClient();

  // Load service name for snapshot
  const { data: svc } = await admin.from("services").select("name").eq("id", options.serviceId).single();
  const { data: res } = await admin.from("resources").select("name").eq("id", options.resourceId).single();
  const { data: loc } = await admin.from("locations").select("name").eq("id", options.locationId).single();

  const { data, error } = await admin
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      service_id: options.serviceId,
      resource_id: options.resourceId,
      location_id: options.locationId,
      starts_at: options.startsAt,
      ends_at: options.endsAt,
      occupied_starts_at: options.startsAt,
      occupied_ends_at: options.endsAt,
      customer_name: options.customerName ?? "Test Customer",
      customer_email: options.customerEmail ?? "test@example.test",
      customer_id: options.customerId ?? null,
      status: options.status ?? "confirmed",
      service_name_snapshot: svc?.name ?? "Test Service",
      resource_name_snapshot: res?.name ?? "Test Resource",
      location_name_snapshot: loc?.name ?? "Test Location",
      duration_minutes: 30,
      appointment_number: `TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`,
      currency: "EUR",
      price: 0,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      ...(options.status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
      ...(options.status === "completed" ? { completed_at: new Date().toISOString() } : {}),
    })
    .select("id, status")
    .single();

  if (error) throw new Error(`Failed to create test appointment: ${error.message}`);

  return { appointmentId: data.id, status: data.status };
}

// ─── Tenant Teardown ─────────────────────────────────────────────────────────

/**
 * Deletes a test tenant and all associated data via CASCADE.
 * Uses service-role to bypass RLS and triggers.
 */
export async function teardownTestTenant(tenantId: string): Promise<void> {
  const admin = createTestAdminClient();

  // Delete memberships first (avoids last-owner trigger blocking tenant delete)
  await admin.from("tenant_members").delete().eq("tenant_id", tenantId);

  // Then delete tenant (cascades to locations, services, appointments, etc.)
  await admin.from("tenants").delete().eq("id", tenantId);
}

// ─── Full Test Environment Setup ─────────────────────────────────────────────

export type FullTestEnvironment = {
  tenantA: TestTenantFixture;
  tenantB: TestTenantFixture;
  ownerA: { userId: string; email: string; password: string };
  ownerB: { userId: string; email: string; password: string };
  staffA: { userId: string; email: string; password: string };
  locationA: TestLocationFixture;
  serviceA: TestServiceFixture;
  resourceTypeA: string;
  resourceA: TestResourceFixture;
};

/**
 * Creates a complete test environment with two tenants, multiple users,
 * and basic service data. Returns everything needed for cross-tenant isolation testing.
 */
export async function setupFullTestEnvironment(): Promise<FullTestEnvironment> {
  const runId = getTestRunId();

  // Create users
  const ownerAEmail = `owner-a-${runId}@test.localhost`;
  const ownerBEmail = `owner-b-${runId}@test.localhost`;
  const staffAEmail = `staff-a-${runId}@test.localhost`;
  const password = "TestPass!Integration123";

  const ownerAId = await createTestUser(ownerAEmail, password);
  const ownerBId = await createTestUser(ownerBEmail, password);
  const staffAId = await createTestUser(staffAEmail, password);

  // Create tenants
  const tenantA = await createTestTenant("a");
  const tenantB = await createTestTenant("b");

  // Create memberships
  await createTestMembership(tenantA.tenantId, ownerAId, "owner");
  await createTestMembership(tenantA.tenantId, staffAId, "staff");
  await createTestMembership(tenantB.tenantId, ownerBId, "owner");

  // Create location, resource type, resource, service for tenant A
  const locationA = await createTestLocation(tenantA.tenantId, "main");
  const resourceTypeA = await createTestResourceType(tenantA.tenantId, "stylist");
  const resourceA = await createTestResource(tenantA.tenantId, "ana", resourceTypeA);
  const serviceA = await createTestService(tenantA.tenantId, "haircut", {
    durationMinutes: 30,
    price: 1500,
    currency: "EUR",
  });

  // Link service to location (required for appointments)
  const adminForLink = createTestAdminClient();
  await adminForLink
    .from("service_locations")
    .insert({
      service_id: serviceA.serviceId,
      location_id: locationA.locationId,
      tenant_id: tenantA.tenantId,
    });

  // Link resource to service (required for appointments)
  await adminForLink
    .from("service_resources")
    .insert({
      service_id: serviceA.serviceId,
      resource_id: resourceA.resourceId,
      tenant_id: tenantA.tenantId,
      is_active: true,
      sort_order: 0,
    });

  // Link resource to location (required for appointments)
  await adminForLink
    .from("resource_locations")
    .insert({
      resource_id: resourceA.resourceId,
      location_id: locationA.locationId,
      tenant_id: tenantA.tenantId,
      is_active: true,
    });

  return {
    tenantA,
    tenantB,
    ownerA: { userId: ownerAId, email: ownerAEmail, password },
    ownerB: { userId: ownerBId, email: ownerBEmail, password },
    staffA: { userId: staffAId, email: staffAEmail, password },
    locationA,
    serviceA,
    resourceTypeA,
    resourceA,
  };
}

/**
 * Tears down the full test environment.
 */
export async function teardownFullTestEnvironment(
  env: FullTestEnvironment
): Promise<void> {
  await teardownTestTenant(env.tenantA.tenantId);
  await teardownTestTenant(env.tenantB.tenantId);
  // Note: users are NOT deleted here — they may be shared or cached.
  // Deletion can be done explicitly if needed.
}
