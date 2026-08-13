"use server";

/**
 * Get Eligible Packages Action — Milestone 15.12.
 *
 * Resolves eligible package credits for an authenticated customer
 * in the public booking context.
 *
 * Authorization:
 * - Uses customer portal session (cookie-based magic-link auth)
 * - Customer identity comes from server session (NOT browser-provided)
 * - Only returns packages for the authenticated customer + tenant
 */

import { getPortalSessionFromCookie } from "@/features/customer-portal/services/portal-session-cookies";
import { resolvePublicBookingContext } from "../services/public-tenant-resolver";
import { getEligiblePackagesForBooking } from "@/features/packages/services/package-queries";

// ─── Types ───────────────────────────────────────────────────────────────────

export type EligiblePackageOption = {
  customerPackageId: string;
  packageName: string;
  creditsRemaining: number;
  creditsRequired: number;
};

export type GetEligiblePackagesResult =
  | { success: true; packages: EligiblePackageOption[]; customerId: string }
  | { success: false; packages: []; customerId: null };

// ─── Main Action ─────────────────────────────────────────────────────────────

/**
 * Fetches eligible package credits for the current authenticated customer.
 *
 * Uses the customer portal session cookie for identity.
 * Returns empty array if:
 * - No session
 * - No customerId in session
 * - Customer has no eligible packages for this service
 * - Tenant/booking context invalid
 */
export async function getEligiblePackagesAction(
  tenantSlug: string,
  serviceId: string
): Promise<GetEligiblePackagesResult> {
  try {
    // Verify public booking context
    const context = await resolvePublicBookingContext(tenantSlug);
    if (!context) {
      return { success: false, packages: [], customerId: null };
    }

    // Get customer session — identity comes from server (NOT browser)
    const session = await getPortalSessionFromCookie(tenantSlug);
    if (!session || !session.customerId) {
      return { success: false, packages: [], customerId: null };
    }

    // Verify session tenant matches booking tenant
    if (session.tenantId !== context.tenant.id) {
      return { success: false, packages: [], customerId: null };
    }

    // Fetch eligible packages using canonical service
    const eligible = await getEligiblePackagesForBooking(
      context.tenant.id,
      session.customerId,
      serviceId
    );

    return {
      success: true,
      packages: eligible.map((pkg) => ({
        customerPackageId: pkg.customerPackageId,
        packageName: pkg.packageName,
        creditsRemaining: pkg.creditsRemaining,
        creditsRequired: pkg.creditsRequired,
      })),
      customerId: session.customerId,
    };
  } catch {
    return { success: false, packages: [], customerId: null };
  }
}
