/**
 * Resource kinds supported by the system.
 */
export const RESOURCE_KINDS = ["person", "room", "equipment", "vehicle", "other"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  person: "Person",
  room: "Room",
  equipment: "Equipment",
  vehicle: "Vehicle",
  other: "Other",
};

/**
 * Resource type as loaded from the database.
 */
export type ResourceType = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  resourceKind: ResourceKind;
  displayNameSingular: string;
  displayNamePlural: string;
  isActive: boolean;
  sortOrder: number;
};

/**
 * Resource as loaded from the database with type and location info.
 */
export type Resource = {
  id: string;
  tenantId: string;
  resourceTypeId: string;
  resourceTypeName: string;
  resourceKind: ResourceKind;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  sortOrder: number;
  locations: ResourceLocationAssignment[];
};

export type ResourceLocationAssignment = {
  id: string;
  locationId: string;
  locationName: string;
  isPrimary: boolean;
  isActive: boolean;
};
