export type Service = {
  id: string;
  tenantId: string;
  serviceCategoryId: string | null;
  categoryName: string | null;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  isActive: boolean;
  sortOrder: number;
};

export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 1440;
export const MAX_BUFFER_MINUTES = 1440;
