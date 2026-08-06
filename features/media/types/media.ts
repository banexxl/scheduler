export const MEDIA_ROLES = ["logo", "cover", "gallery", "profile"] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export type MediaAsset = {
  id: string;
  tenantId: string;
  locationId: string | null;
  resourceId: string | null;
  mediaRole: MediaRole;
  storageBucket: string;
  storagePath: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

export type MediaTarget = "business" | "location" | "resource";

/** Valid media roles per target */
export const TARGET_ALLOWED_ROLES: Record<MediaTarget, MediaRole[]> = {
  business: ["logo", "cover", "gallery"],
  location: ["cover", "gallery"],
  resource: ["profile", "gallery"],
};

/** Single-image roles (only one active at a time) */
export const SINGLE_IMAGE_ROLES: MediaRole[] = ["logo", "cover", "profile"];
