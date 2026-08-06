import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_LOGO_SIZE_BYTES,
  type MediaRole,
} from "../types/media";

export type FileValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates a file for media upload (client-side).
 */
export function validateMediaFile(
  file: File,
  mediaRole: MediaRole
): FileValidationResult {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return { valid: false, error: "Only JPEG, PNG, and WebP images are allowed." };
  }

  // Check extension
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return { valid: false, error: "Invalid file extension. Use .jpg, .png, or .webp." };
  }

  // Check size
  const maxSize = mediaRole === "logo" ? MAX_LOGO_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return { valid: false, error: `File size must be ${maxMB} MB or less.` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  return { valid: true };
}
