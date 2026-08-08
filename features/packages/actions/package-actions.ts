"use server";

/**
 * Package Management Actions — Milestone 8.9.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createClient } from "@/lib/supabase/server";
import { packageFormSchema } from "../schemas/package-schemas";

type ActionResult = { success: true; id?: string } | { success: false; error: string };

// ─── Create Package ──────────────────────────────────────────────────────────

export async function createPackageAction(
  tenantSlug: string,
  input: {
    name: string;
    description?: string | null;
    totalCredits: number;
    validityDays?: number | null;
    isActive?: boolean;
    isPublic?: boolean;
    services?: Array<{ serviceId: string; creditsRequired: number }>;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await packageFormSchema.validate(input, { abortEarly: false, stripUnknown: true });

    const supabase = await createClient();

    // Insert package
    const { data, error } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
      .from("service_packages" as never)
      .insert({
        tenant_id: tenant.id,
        name: validated.name,
        description: validated.description ?? null,
        total_credits: validated.totalCredits,
        validity_days: validated.validityDays ?? null,
        is_active: validated.isActive ?? true,
        is_public: validated.isPublic ?? false,
      } as never)
      .select("id")
      .single();

    if (error || !data) return { success: false, error: "Failed to create package." };

    const packageId = (data as unknown as { id: string }).id;

    // Insert service assignments
    if (input.services && input.services.length > 0) {
      const serviceRows = input.services.map(s => ({
        tenant_id: tenant.id,
        package_id: packageId,
        service_id: s.serviceId,
        credits_required: s.creditsRequired,
      }));

      await (supabase as never as Awaited<ReturnType<typeof createClient>>)
        .from("service_package_services" as never)
        .insert(serviceRows as never);
    }

    return { success: true, id: packageId };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const ve = error as { errors?: string[] };
      return { success: false, error: ve.errors?.join(", ") ?? "Validation failed" };
    }
    return { success: false, error: "Failed to create package." };
  }
}

// ─── Update Package ──────────────────────────────────────────────────────────

export async function updatePackageAction(
  tenantSlug: string,
  packageId: string,
  input: {
    name?: string;
    description?: string | null;
    totalCredits?: number;
    validityDays?: number | null;
    isActive?: boolean;
    isPublic?: boolean;
  }
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.totalCredits !== undefined) updates.total_credits = input.totalCredits;
    if (input.validityDays !== undefined) updates.validity_days = input.validityDays;
    if (input.isActive !== undefined) updates.is_active = input.isActive;
    if (input.isPublic !== undefined) updates.is_public = input.isPublic;

    if (Object.keys(updates).length === 0) return { success: true };

    const { error } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
      .from("service_packages" as never)
      .update(updates as never)
      .eq("id" as never, packageId)
      .eq("tenant_id" as never, tenant.id);

    if (error) return { success: false, error: "Failed to update package." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update package." };
  }
}

// ─── Toggle Active ───────────────────────────────────────────────────────────

export async function togglePackageAction(
  tenantSlug: string,
  packageId: string,
  isActive: boolean
): Promise<ActionResult> {
  return updatePackageAction(tenantSlug, packageId, { isActive });
}
