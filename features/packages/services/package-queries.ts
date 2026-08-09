import "server-only";

/**
 * Package Query Services — Milestone 8.9.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ServicePackage,
  ServicePackageListItem,
  PackageServiceItem,
  CustomerPackageListItem,
  PackageUsageItem,
  PackageAdjustment,
  PortalPackageItem,
} from "../types/package";

// ─── List Packages ───────────────────────────────────────────────────────────

export async function getPackages(tenantId: string): Promise<ServicePackageListItem[]> {
  const supabase = await createClient();

  const { data } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
    .from("service_packages" as never)
    .select("id, name, total_credits, validity_days, is_active, is_public, sort_order" as never)
    .eq("tenant_id" as never, tenantId)
    .order("sort_order" as never, { ascending: true });

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;
  const packageIds = rows.map(r => r.id as string);

  // Count services and assignments per package
  const admin = createAdminClient();
  const [servicesResult, assignmentsResult] = await Promise.all([
    packageIds.length > 0
      ? (admin as never as ReturnType<typeof createAdminClient>).from("service_package_services" as never).select("package_id" as never).eq("tenant_id" as never, tenantId).in("package_id" as never, packageIds as never)
      : { data: [] },
    packageIds.length > 0
      ? (admin as never as ReturnType<typeof createAdminClient>).from("customer_packages" as never).select("package_id" as never).eq("tenant_id" as never, tenantId).in("package_id" as never, packageIds as never)
      : { data: [] },
  ]);

  const serviceCounts = new Map<string, number>();
  for (const r of ((servicesResult as { data: unknown }).data ?? []) as Array<{ package_id: string }>) {
    serviceCounts.set(r.package_id, (serviceCounts.get(r.package_id) ?? 0) + 1);
  }

  const assignmentCounts = new Map<string, number>();
  for (const r of ((assignmentsResult as { data: unknown }).data ?? []) as Array<{ package_id: string }>) {
    assignmentCounts.set(r.package_id, (assignmentCounts.get(r.package_id) ?? 0) + 1);
  }

  return rows.map((row): ServicePackageListItem => ({
    id: row.id as string,
    name: row.name as string,
    totalCredits: row.total_credits as number,
    validityDays: (row.validity_days as number) ?? null,
    isActive: Boolean(row.is_active),
    isPublic: Boolean(row.is_public),
    serviceCount: serviceCounts.get(row.id as string) ?? 0,
    assignmentCount: assignmentCounts.get(row.id as string) ?? 0,
  }));
}

// ─── Get Package by ID ───────────────────────────────────────────────────────

export async function getPackageById(tenantId: string, packageId: string): Promise<ServicePackage | null> {
  const supabase = await createClient();

  const { data } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
    .from("service_packages" as never)
    .select("*")
    .eq("tenant_id" as never, tenantId)
    .eq("id" as never, packageId)
    .single();

  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;

  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    totalCredits: row.total_credits as number,
    validityDays: (row.validity_days as number) ?? null,
    isActive: Boolean(row.is_active),
    isPublic: Boolean(row.is_public),
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Get Package Services ────────────────────────────────────────────────────

export async function getPackageServices(tenantId: string, packageId: string): Promise<PackageServiceItem[]> {
  const supabase = await createClient();

  const { data } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
    .from("service_package_services" as never)
    .select("id, service_id, credits_required" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("package_id" as never, packageId);

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;
  const serviceIds = rows.map(r => r.service_id as string);

  if (serviceIds.length === 0) return [];

  const { data: services } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
    .from("services" as never)
    .select("id, name" as never)
    .in("id" as never, serviceIds as never);

  const nameMap = new Map(((services ?? []) as unknown as Array<{ id: string; name: string }>).map(s => [s.id, s.name]));

  return rows.map((row): PackageServiceItem => ({
    id: row.id as string,
    serviceId: row.service_id as string,
    serviceName: nameMap.get(row.service_id as string) ?? "Unknown",
    creditsRequired: row.credits_required as number,
  }));
}

// ─── Customer Packages ───────────────────────────────────────────────────────

export async function getCustomerPackages(tenantId: string, customerId: string): Promise<CustomerPackageListItem[]> {
  const admin = createAdminClient();

  const { data } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("customer_packages" as never)
    .select("id, package_id, credits_total, credits_remaining, expires_at, status" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_id" as never, customerId)
    .order("created_at" as never, { ascending: false });

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;
  const packageIds = [...new Set(rows.map(r => r.package_id as string))];

  const { data: packages } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("service_packages" as never)
    .select("id, name" as never)
    .in("id" as never, packageIds as never);

  const nameMap = new Map(((packages ?? []) as unknown as Array<{ id: string; name: string }>).map(p => [p.id, p.name]));

  return rows.map((row): CustomerPackageListItem => ({
    id: row.id as string,
    packageName: nameMap.get(row.package_id as string) ?? "Unknown",
    creditsTotal: row.credits_total as number,
    creditsRemaining: row.credits_remaining as number,
    expiresAt: (row.expires_at as string) ?? null,
    status: row.status as CustomerPackageListItem["status"],
  }));
}

// ─── Eligible Packages for Customer+Service ──────────────────────────────────

export async function getEligiblePackagesForBooking(
  tenantId: string,
  customerId: string,
  serviceId: string
): Promise<Array<{ customerPackageId: string; packageName: string; creditsRemaining: number; creditsRequired: number }>> {
  const admin = createAdminClient();

  // Get active customer packages
  const { data: custPkgs } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("customer_packages" as never)
    .select("id, package_id, credits_remaining, expires_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_id" as never, customerId)
    .eq("status" as never, "active");

  if (!custPkgs || (custPkgs as unknown as unknown[]).length === 0) return [];

  const rows = custPkgs as unknown as Array<{ id: string; package_id: string; credits_remaining: number; expires_at: string | null }>;

  // Filter non-expired
  const now = new Date();
  const valid = rows.filter(r => !r.expires_at || new Date(r.expires_at) > now);
  if (valid.length === 0) return [];

  const packageIds = valid.map(r => r.package_id);

  // Check service eligibility
  const { data: eligibility } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("service_package_services" as never)
    .select("package_id, credits_required" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("service_id" as never, serviceId)
    .in("package_id" as never, packageIds as never);

  if (!eligibility || (eligibility as unknown as unknown[]).length === 0) return [];

  const eligMap = new Map((eligibility as unknown as Array<{ package_id: string; credits_required: number }>).map(e => [e.package_id, e.credits_required]));

  // Load package names
  const { data: pkgNames } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("service_packages" as never)
    .select("id, name" as never)
    .in("id" as never, packageIds as never);

  const nameMap = new Map(((pkgNames ?? []) as unknown as Array<{ id: string; name: string }>).map(p => [p.id, p.name]));

  return valid
    .filter(r => eligMap.has(r.package_id))
    .filter(r => r.credits_remaining >= (eligMap.get(r.package_id) ?? 1))
    .map(r => ({
      customerPackageId: r.id,
      packageName: nameMap.get(r.package_id) ?? "Package",
      creditsRemaining: r.credits_remaining,
      creditsRequired: eligMap.get(r.package_id) ?? 1,
    }));
}

// ─── Usage History ───────────────────────────────────────────────────────────

export async function getPackageUsageHistory(tenantId: string, customerPackageId: string, limit = 50): Promise<PackageUsageItem[]> {
  const admin = createAdminClient();

  const { data } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("customer_package_usage" as never)
    .select("id, appointment_id, service_id, credits_used, status, reserved_at, consumed_at, released_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_package_id" as never, customerPackageId)
    .order("created_at" as never, { ascending: false })
    .limit(Math.min(limit, 100));

  if (!data) return [];

  const rows = data as unknown as Array<Record<string, unknown>>;
  const serviceIds = [...new Set(rows.map(r => r.service_id as string))];

  const { data: services } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("services" as never)
    .select("id, name" as never)
    .in("id" as never, serviceIds as never);

  const nameMap = new Map(((services ?? []) as unknown as Array<{ id: string; name: string }>).map(s => [s.id, s.name]));

  return rows.map((row): PackageUsageItem => ({
    id: row.id as string,
    appointmentId: row.appointment_id as string,
    serviceName: nameMap.get(row.service_id as string) ?? "Service",
    creditsUsed: row.credits_used as number,
    status: row.status as PackageUsageItem["status"],
    reservedAt: (row.reserved_at as string) ?? null,
    consumedAt: (row.consumed_at as string) ?? null,
    releasedAt: (row.released_at as string) ?? null,
  }));
}

// ─── Adjustments ─────────────────────────────────────────────────────────────

export async function getPackageAdjustments(tenantId: string, customerPackageId: string, limit = 50): Promise<PackageAdjustment[]> {
  const admin = createAdminClient();

  const { data } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("customer_package_adjustments" as never)
    .select("id, delta, reason, created_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_package_id" as never, customerPackageId)
    .order("created_at" as never, { ascending: false })
    .limit(Math.min(limit, 100));

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((row): PackageAdjustment => ({
    id: row.id as string,
    delta: row.delta as number,
    reason: row.reason as string,
    createdAt: row.created_at as string,
  }));
}

// ─── Portal: Customer Packages by Email ──────────────────────────────────────

export async function getPortalCustomerPackages(tenantId: string, normalizedEmail: string): Promise<PortalPackageItem[]> {
  const admin = createAdminClient();

  // Find customer by email
  const { data: customerRow } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("tenant_customers" as never)
    .select("id" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("email" as never, normalizedEmail)
    .single();

  if (!customerRow) return [];

  const customerId = (customerRow as unknown as { id: string }).id;

  const { data: cpRows } = await (admin as never as ReturnType<typeof createAdminClient>)
    .from("customer_packages" as never)
    .select("id, package_id, credits_total, credits_remaining, expires_at, status" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("customer_id" as never, customerId)
    .in("status" as never, ["active", "exhausted"] as never)
    .order("created_at" as never, { ascending: false });

  if (!cpRows || (cpRows as unknown as unknown[]).length === 0) return [];

  const rows = cpRows as unknown as Array<Record<string, unknown>>;
  const packageIds = [...new Set(rows.map(r => r.package_id as string))];

  // Load package names + eligible services
  const [pkgResult, spsResult] = await Promise.all([
    (admin as never as ReturnType<typeof createAdminClient>).from("service_packages" as never).select("id, name" as never).in("id" as never, packageIds as never),
    (admin as never as ReturnType<typeof createAdminClient>).from("service_package_services" as never).select("package_id, service_id" as never).eq("tenant_id" as never, tenantId).in("package_id" as never, packageIds as never),
  ]);

  const nameMap = new Map((((pkgResult as { data: unknown }).data ?? []) as unknown as Array<{ id: string; name: string }>).map(p => [p.id, p.name]));

  const serviceIdsByPackage = new Map<string, string[]>();
  for (const r of ((spsResult as { data: unknown }).data ?? []) as unknown as Array<{ package_id: string; service_id: string }>) {
    const arr = serviceIdsByPackage.get(r.package_id) ?? [];
    arr.push(r.service_id);
    serviceIdsByPackage.set(r.package_id, arr);
  }

  // Load service names
  const allServiceIds = [...new Set([...serviceIdsByPackage.values()].flat())];
  const { data: svcNames } = allServiceIds.length > 0
    ? await (admin as never as ReturnType<typeof createAdminClient>).from("services" as never).select("id, name" as never).in("id" as never, allServiceIds as never)
    : { data: [] };

  const svcNameMap = new Map(((svcNames ?? []) as unknown as Array<{ id: string; name: string }>).map(s => [s.id, s.name]));

  return rows.map((row): PortalPackageItem => {
    const pkgId = row.package_id as string;
    const serviceIds = serviceIdsByPackage.get(pkgId) ?? [];
    return {
      packageName: nameMap.get(pkgId) ?? "Package",
      creditsTotal: row.credits_total as number,
      creditsRemaining: row.credits_remaining as number,
      expiresAt: (row.expires_at as string) ?? null,
      status: row.status as string,
      eligibleServices: serviceIds.map(id => svcNameMap.get(id) ?? "Service"),
    };
  });
}
