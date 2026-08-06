/**
 * Domain types for service-location assignments.
 *
 * A service-location assignment means the service MAY be offered at that location.
 * It does NOT imply resource availability or appointment bookability.
 */

// ─── Core Row Type ───────────────────────────────────────────────────────────

export type ServiceLocation = {
  id: string;
  tenantId: string;
  serviceId: string;
  locationId: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ─── Insert / Update ─────────────────────────────────────────────────────────

export type ServiceLocationInsert = {
  tenantId: string;
  serviceId: string;
  locationId: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type ServiceLocationUpdate = {
  isActive?: boolean;
  sortOrder?: number;
};

// ─── Joined Types ────────────────────────────────────────────────────────────

export type ServiceLocationWithLocation = ServiceLocation & {
  locationName: string;
  locationSlug: string;
  locationType: string;
  locationIsActive: boolean;
};

export type ServiceLocationWithService = ServiceLocation & {
  serviceName: string;
  serviceSlug: string;
  serviceIsActive: boolean;
  serviceDurationMinutes: number;
  servicePrice: number;
  serviceCurrency: string;
};

// ─── Aggregated Types ────────────────────────────────────────────────────────

export type ServiceWithLocations = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  isActive: boolean;
  locations: ServiceLocationWithLocation[];
};

// ─── Input Types ─────────────────────────────────────────────────────────────

/** Input for the set_service_locations RPC / action */
export type SetServiceLocationsInput = {
  serviceId: string;
  locationIds: string[];
};
