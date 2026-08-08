/**
 * Package Domain Types — Milestone 8.9.
 */

// ─── Package Statuses ────────────────────────────────────────────────────────

export const CUSTOMER_PACKAGE_STATUSES = ["active", "exhausted", "expired", "cancelled"] as const;
export type CustomerPackageStatus = (typeof CUSTOMER_PACKAGE_STATUSES)[number];

export const PACKAGE_USAGE_STATUSES = ["reserved", "consumed", "released"] as const;
export type PackageUsageStatus = (typeof PACKAGE_USAGE_STATUSES)[number];

export const PACKAGE_SOURCES = ["manual", "payment", "promotion", "migration", "admin_adjustment"] as const;
export type PackageSource = (typeof PACKAGE_SOURCES)[number];

// ─── Service Package Definition ──────────────────────────────────────────────

export type ServicePackage = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  totalCredits: number;
  validityDays: number | null;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ServicePackageListItem = {
  id: string;
  name: string;
  totalCredits: number;
  validityDays: number | null;
  isActive: boolean;
  isPublic: boolean;
  serviceCount: number;
  assignmentCount: number;
};

// ─── Package Service Eligibility ─────────────────────────────────────────────

export type PackageServiceItem = {
  id: string;
  serviceId: string;
  serviceName: string;
  creditsRequired: number;
};

// ─── Customer Package ────────────────────────────────────────────────────────

export type CustomerPackage = {
  id: string;
  tenantId: string;
  customerId: string;
  packageId: string;
  packageName: string;
  creditsTotal: number;
  creditsRemaining: number;
  startsAt: string;
  expiresAt: string | null;
  status: CustomerPackageStatus;
  source: PackageSource;
  assignmentNote: string | null;
  createdAt: string;
};

export type CustomerPackageListItem = {
  id: string;
  packageName: string;
  creditsTotal: number;
  creditsRemaining: number;
  expiresAt: string | null;
  status: CustomerPackageStatus;
};

// ─── Package Usage ───────────────────────────────────────────────────────────

export type PackageUsageItem = {
  id: string;
  appointmentId: string;
  serviceName: string;
  creditsUsed: number;
  status: PackageUsageStatus;
  reservedAt: string | null;
  consumedAt: string | null;
  releasedAt: string | null;
};

// ─── Package Adjustment ──────────────────────────────────────────────────────

export type PackageAdjustment = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
};

// ─── Create/Update Inputs ────────────────────────────────────────────────────

export type CreatePackageInput = {
  name: string;
  description?: string | null;
  totalCredits: number;
  validityDays?: number | null;
  isActive?: boolean;
  isPublic?: boolean;
  services: Array<{ serviceId: string; creditsRequired: number }>;
};

export type UpdatePackageInput = {
  name?: string;
  description?: string | null;
  totalCredits?: number;
  validityDays?: number | null;
  isActive?: boolean;
  isPublic?: boolean;
};

export type AssignPackageInput = {
  customerId: string;
  packageId: string;
  startsAt?: string;
  expiresAt?: string | null;
  creditsOverride?: number | null;
  note?: string | null;
};

export type AdjustCreditsInput = {
  customerPackageId: string;
  delta: number;
  reason: string;
};

// ─── Portal DTO ──────────────────────────────────────────────────────────────

export type PortalPackageItem = {
  packageName: string;
  creditsTotal: number;
  creditsRemaining: number;
  expiresAt: string | null;
  status: string;
  eligibleServices: string[];
};
