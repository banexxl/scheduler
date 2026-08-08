"use server";

/**
 * Customer Package Actions — Milestone 8.9.
 *
 * Assign packages to customers, cancel ownership, adjust credits.
 */

import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignPackageSchema, adjustCreditsSchema } from "../schemas/package-schemas";

type ActionResult = { success: true; id?: string } | { success: false; error: string };

// ─── Assign Package to Customer ──────────────────────────────────────────────

export async function assignPackageAction(
  tenantSlug: string,
  input: {
    customerId: string;
    packageId: string;
    note?: string | null;
    creditsOverride?: number | null;
  }
): Promise<ActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin", "manager"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await assignPackageSchema.validate(input, { abortEarly: false, stripUnknown: true });
    const supabase = createAdminClient();

    // Load package definition
    const { data: pkgRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("service_packages" as never)
      .select("id, total_credits, validity_days, is_active" as never)
      .eq("id" as never, validated.packageId)
      .eq("tenant_id" as never, tenant.id)
      .single();

    if (!pkgRow) return { success: false, error: "Package not found." };

    const pkg = pkgRow as unknown as { id: string; total_credits: number; validity_days: number | null; is_active: boolean };

    if (!pkg.is_active) return { success: false, error: "Package is inactive." };

    // Determine credits and expiry
    const credits = input.creditsOverride ?? pkg.total_credits;
    const startsAt = new Date().toISOString();
    const expiresAt = pkg.validity_days
      ? new Date(Date.now() + pkg.validity_days * 24 * 60 * 60_000).toISOString()
      : null;

    // Insert customer package
    const { data, error } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_packages" as never)
      .insert({
        tenant_id: tenant.id,
        customer_id: validated.customerId,
        package_id: validated.packageId,
        credits_total: credits,
        credits_remaining: credits,
        starts_at: startsAt,
        expires_at: expiresAt,
        status: "active",
        assigned_by: user.id,
        assignment_note: validated.note ?? null,
        source: "manual",
      } as never)
      .select("id")
      .single();

    if (error || !data) return { success: false, error: "Failed to assign package." };

    return { success: true, id: (data as unknown as { id: string }).id };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const ve = error as { errors?: string[] };
      return { success: false, error: ve.errors?.join(", ") ?? "Validation failed" };
    }
    return { success: false, error: "Failed to assign package." };
  }
}

// ─── Cancel Customer Package ─────────────────────────────────────────────────

export async function cancelCustomerPackageAction(
  tenantSlug: string,
  customerPackageId: string
): Promise<ActionResult> {
  try {
    const { tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const supabase = createAdminClient();

    const { error } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_packages" as never)
      .update({ status: "cancelled" } as never)
      .eq("id" as never, customerPackageId)
      .eq("tenant_id" as never, tenant.id)
      .in("status" as never, ["active", "exhausted"] as never);

    if (error) return { success: false, error: "Failed to cancel package." };
    return { success: true };
  } catch {
    return { success: false, error: "Failed to cancel package." };
  }
}

// ─── Adjust Credits ──────────────────────────────────────────────────────────

export async function adjustPackageCreditsAction(
  tenantSlug: string,
  input: {
    customerPackageId: string;
    delta: number;
    reason: string;
  }
): Promise<ActionResult> {
  try {
    const { user, tenant, membership } = await requireTenantMember(tenantSlug);
    if (!["owner", "admin"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions." };
    }

    const validated = await adjustCreditsSchema.validate(input, { abortEarly: false, stripUnknown: true });
    const supabase = createAdminClient();

    // Load current package
    const { data: cpRow } = await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_packages" as never)
      .select("id, credits_remaining, status" as never)
      .eq("id" as never, validated.customerPackageId)
      .eq("tenant_id" as never, tenant.id)
      .single();

    if (!cpRow) return { success: false, error: "Customer package not found." };

    const cp = cpRow as unknown as { id: string; credits_remaining: number; status: string };
    const newRemaining = cp.credits_remaining + validated.delta;

    if (newRemaining < 0) return { success: false, error: "Cannot reduce below zero." };

    // Update credits
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_packages" as never)
      .update({
        credits_remaining: newRemaining,
        credits_total: newRemaining > 0 && cp.status === "exhausted" ? undefined : undefined,
        status: newRemaining === 0 ? "exhausted" : newRemaining > 0 && cp.status === "exhausted" ? "active" : cp.status,
      } as never)
      .eq("id" as never, validated.customerPackageId);

    // Insert adjustment record
    await (supabase as never as ReturnType<typeof createAdminClient>)
      .from("customer_package_adjustments" as never)
      .insert({
        tenant_id: tenant.id,
        customer_package_id: validated.customerPackageId,
        delta: validated.delta,
        reason: validated.reason,
        adjusted_by: user.id,
      } as never);

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const ve = error as { errors?: string[] };
      return { success: false, error: ve.errors?.join(", ") ?? "Validation failed" };
    }
    return { success: false, error: "Failed to adjust credits." };
  }
}
