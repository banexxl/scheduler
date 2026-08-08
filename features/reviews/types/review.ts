/**
 * Review Domain Types — Milestone 8.7.
 */

// ─── Review Status ───────────────────────────────────────────────────────────

export const REVIEW_STATUSES = ["published", "hidden", "flagged"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// ─── Customer Review ─────────────────────────────────────────────────────────

export type CustomerReview = {
  id: string;
  tenantId: string;
  appointmentId: string;
  customerId: string | null;
  serviceId: string | null;
  resourceId: string | null;
  locationId: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  isFeatured: boolean;
  serviceNameSnapshot: string | null;
  resourceNameSnapshot: string | null;
  customerNameSnapshot: string | null;
  businessResponse: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

// ─── Review List Item ────────────────────────────────────────────────────────

export type ReviewListItem = {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  isFeatured: boolean;
  serviceNameSnapshot: string | null;
  resourceNameSnapshot: string | null;
  customerNameSnapshot: string | null;
  businessResponse: string | null;
  respondedAt: string | null;
  submittedAt: string;
};

// ─── Review Summary ──────────────────────────────────────────────────────────

export type ReviewSummary = {
  totalReviews: number;
  averageRating: number | null;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

// ─── Public Review ───────────────────────────────────────────────────────────

export type PublicReview = {
  rating: number;
  customerDisplayName: string;
  comment: string | null;
  serviceName: string | null;
  submittedAt: string;
};

// ─── Review Token Resolution ─────────────────────────────────────────────────

export type ReviewTokenContext = {
  tokenId: string;
  tenantId: string;
  appointmentId: string;
  tenantName: string;
  serviceName: string;
  appointmentDate: string;
  customerName: string;
  hasExistingReview: boolean;
};

// ─── Submit Review Input ─────────────────────────────────────────────────────

export type SubmitReviewInput = {
  rating: number;
  comment?: string | null;
};
