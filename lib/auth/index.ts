/**
 * Authorization Helpers — Consolidated exports.
 *
 * Actor model:
 * - requireUser: any authenticated user
 * - requireTenantMember: business route (any role)
 * - requireTenantRole: business route (specific roles)
 * - requirePlatformAdmin: platform admin
 * - requireCustomerAccount: permanent customer account
 * - requireLinkedTenantCustomer: customer with active link to tenant
 * - requireCustomerAppointmentAccess: customer owns specific appointment
 *
 * Error types:
 * - UnauthenticatedError
 * - UnauthorizedError
 * - TenantAccessDeniedError
 * - CustomerLinkRequiredError
 * - ResourceNotFoundError
 */

export { getUser } from "./get-user";
export { requireUser } from "./require-user";
export { getSafeRedirectPath } from "./get-safe-redirect-path";
export { requireCustomerAccount, type CustomerAccountContext } from "./require-customer-account";
export { requireLinkedTenantCustomer, type LinkedTenantCustomerContext } from "./require-linked-tenant-customer";
export { requireCustomerAppointmentAccess, type CustomerAppointmentAccessContext } from "./require-customer-appointment-access";
export {
  UnauthenticatedError,
  UnauthorizedError,
  TenantAccessDeniedError,
  CustomerLinkRequiredError,
  ResourceNotFoundError,
} from "./errors";
