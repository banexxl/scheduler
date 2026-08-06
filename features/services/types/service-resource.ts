/**
 * Domain types for service-resource assignments.
 *
 * A service-resource assignment means the resource is qualified to perform the service.
 * It does NOT imply the resource is available, working, or located where the service is offered.
 */

import type { ResourceKind } from "@/features/resources/types/resource";

// ─── Core Row Type ───────────────────────────────────────────────────────────

export type ServiceResource = {
  id: string;
  tenantId: string;
  serviceId: string;
  resourceId: string;
  isActive: boolean;
  durationOverrideMinutes: number | null;
  priceOverride: number | null;
  currencyOverride: string | null;
  bufferBeforeOverrideMinutes: number | null;
  bufferAfterOverrideMinutes: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Insert / Update ─────────────────────────────────────────────────────────

export type ServiceResourceInsert = {
  tenantId: string;
  serviceId: string;
  resourceId: string;
  isActive?: boolean;
  durationOverrideMinutes?: number | null;
  priceOverride?: number | null;
  currencyOverride?: string | null;
  bufferBeforeOverrideMinutes?: number | null;
  bufferAfterOverrideMinutes?: number | null;
  sortOrder?: number;
};

export type ServiceResourceUpdate = {
  isActive?: boolean;
  durationOverrideMinutes?: number | null;
  priceOverride?: number | null;
  currencyOverride?: string | null;
  bufferBeforeOverrideMinutes?: number | null;
  bufferAfterOverrideMinutes?: number | null;
  sortOrder?: number;
};

// ─── Joined Types ────────────────────────────────────────────────────────────

export type ServiceResourceWithResource = ServiceResource & {
  resourceName: string;
  resourceSlug: string;
  resourceKind: ResourceKind;
  resourceTypeName: string;
  resourceIsActive: boolean;
};

export type ServiceResourceWithService = ServiceResource & {
  serviceName: string;
  serviceSlug: string;
  serviceIsActive: boolean;
  serviceDurationMinutes: number;
  servicePrice: number;
  serviceCurrency: string;
  serviceBufferBeforeMinutes: number;
  serviceBufferAfterMinutes: number;
};

// ─── Aggregated Types ────────────────────────────────────────────────────────

export type ServiceWithResources = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  isActive: boolean;
  resources: ServiceResourceWithResource[];
};

export type ResourceWithServices = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  isActive: boolean;
  services: ServiceResourceWithService[];
};

// ─── Input Types ─────────────────────────────────────────────────────────────

/** Input for a single resource assignment within the set_service_resources RPC */
export type ServiceResourceAssignmentInput = {
  resourceId: string;
  isActive?: boolean;
  durationOverrideMinutes?: number | null;
  priceOverride?: number | null;
  currencyOverride?: string | null;
  bufferBeforeOverrideMinutes?: number | null;
  bufferAfterOverrideMinutes?: number | null;
  sortOrder?: number;
};

// ─── Resolved Values ─────────────────────────────────────────────────────────

/** Effective values after resolving overrides against base service defaults */
export type ResolvedServiceResourceValues = {
  duration: number;
  price: number;
  currency: string;
  bufferBefore: number;
  bufferAfter: number;
  /** Indicates which fields are overridden vs inherited from the service */
  overrides: {
    duration: boolean;
    price: boolean;
    currency: boolean;
    bufferBefore: boolean;
    bufferAfter: boolean;
  };
};
