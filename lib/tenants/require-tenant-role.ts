import "server-only";
import { notFound } from "next/navigation";
import {
  requireTenantMember,
  type TenantMemberContext,
} from "./require-tenant-member";

type TenantRole = "owner" | "admin" | "manager" | "staff";

/**
 * Requires that the current user has one of the specified roles
 * within the given tenant.
 *
 * Calls notFound() if the user's role is not in the allowed list.
 */
export async function requireTenantRole(
  tenantSlug: string,
  allowedRoles: TenantRole[]
): Promise<TenantMemberContext> {
  const context = await requireTenantMember(tenantSlug);

  if (!allowedRoles.includes(context.membership.role as TenantRole)) {
    notFound();
  }

  return context;
}
