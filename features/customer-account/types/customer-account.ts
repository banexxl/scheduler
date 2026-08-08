/**
 * Customer Account Types — Milestone 9.1.
 */

// ─── Link Status ─────────────────────────────────────────────────────────────

export const LINK_STATUSES = ["pending", "linked", "revoked", "conflict"] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const LINK_METHODS = [
  "account_registration",
  "verified_email",
  "portal_session",
  "appointment_claim",
  "manual_support",
] as const;
export type LinkMethod = (typeof LINK_METHODS)[number];

// ─── Customer Account ────────────────────────────────────────────────────────

export type CustomerAccount = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
};

// ─── Tenant Link ─────────────────────────────────────────────────────────────

export type TenantLink = {
  id: string;
  tenantId: string;
  tenantCustomerId: string;
  linkStatus: LinkStatus;
  linkMethod: LinkMethod;
  linkedAt: string;
  verifiedAt: string | null;
};

// ─── Linked Business ─────────────────────────────────────────────────────────

export type LinkedBusiness = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  linkedAt: string;
};

// ─── Link Result ─────────────────────────────────────────────────────────────

export type CustomerAccountLinkResult =
  | { status: "linked"; linkId: string }
  | { status: "already_linked"; linkId: string }
  | { status: "no_match" }
  | { status: "conflict" }
  | { status: "email_not_verified" };
