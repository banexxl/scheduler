import "server-only";

/**
 * Review Query Services — Milestone 8.7.
 *
 * Tenant-scoped queries for internal reviews management.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReviewListItem, ReviewSummary, PublicReview } from "../types/review";

// ─── Get Reviews List ────────────────────────────────────────────────────────

export type ReviewFilters = {
  rating?: number | null;
  status?: string | null;
  serviceId?: string | null;
  resourceId?: string | null;
};

export async function getReviews(
  tenantId: string,
  filters: ReviewFilters = {},
  limit = 50,
  offset = 0
): Promise<{ items: ReviewListItem[]; total: number }> {
  const supabase = await createClient();

  let query = (supabase as never as ReturnType<typeof createClient> extends Promise<infer U> ? U : never)
    .from("customer_reviews" as never)
    .select("id, rating, comment, status, is_featured, service_name_snapshot, resource_name_snapshot, customer_name_snapshot, business_response, responded_at, submitted_at" as never, { count: "exact" })
    .eq("tenant_id" as never, tenantId);

  if (filters.rating) query = query.eq("rating" as never, filters.rating);
  if (filters.status) query = query.eq("status" as never, filters.status);
  if (filters.serviceId) query = query.eq("service_id" as never, filters.serviceId);
  if (filters.resourceId) query = query.eq("resource_id" as never, filters.resourceId);

  const { data, count } = await query
    .order("submitted_at" as never, { ascending: false })
    .range(offset, offset + limit - 1);

  if (!data) return { items: [], total: 0 };

  const items = (data as unknown as Array<Record<string, unknown>>).map((row): ReviewListItem => ({
    id: row.id as string,
    rating: row.rating as number,
    comment: (row.comment as string) ?? null,
    status: row.status as ReviewListItem["status"],
    isFeatured: Boolean(row.is_featured),
    serviceNameSnapshot: (row.service_name_snapshot as string) ?? null,
    resourceNameSnapshot: (row.resource_name_snapshot as string) ?? null,
    customerNameSnapshot: (row.customer_name_snapshot as string) ?? null,
    businessResponse: (row.business_response as string) ?? null,
    respondedAt: (row.responded_at as string) ?? null,
    submittedAt: row.submitted_at as string,
  }));

  return { items, total: count ?? items.length };
}

// ─── Get Review Summary ──────────────────────────────────────────────────────

export async function getReviewSummary(tenantId: string): Promise<ReviewSummary> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_reviews" as never)
    .select("rating" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "published");

  if (!data || (data as unknown as unknown[]).length === 0) {
    return {
      totalReviews: 0,
      averageRating: null,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const rows = data as unknown as Array<{ rating: number }>;
  const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const row of rows) {
    const r = row.rating as 1 | 2 | 3 | 4 | 5;
    dist[r] = (dist[r] ?? 0) + 1;
    sum += r;
  }

  return {
    totalReviews: rows.length,
    averageRating: Math.round((sum / rows.length) * 10) / 10,
    ratingDistribution: dist,
  };
}

// ─── Get Public Reviews ──────────────────────────────────────────────────────

export async function getPublicReviews(
  tenantId: string,
  limit = 5
): Promise<PublicReview[]> {
  const supabase = createAdminClient();

  const { data } = await (supabase as never as ReturnType<typeof createAdminClient>)
    .from("customer_reviews" as never)
    .select("rating, comment, customer_name_snapshot, service_name_snapshot, submitted_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("status" as never, "published")
    .order("is_featured" as never, { ascending: false })
    .order("submitted_at" as never, { ascending: false })
    .limit(limit);

  if (!data) return [];

  return (data as unknown as Array<Record<string, unknown>>).map((row): PublicReview => {
    const fullName = (row.customer_name_snapshot as string) ?? "Customer";
    const firstName = fullName.split(" ")[0] ?? fullName.charAt(0);

    return {
      rating: row.rating as number,
      customerDisplayName: firstName,
      comment: (row.comment as string) ?? null,
      serviceName: (row.service_name_snapshot as string) ?? null,
      submittedAt: row.submitted_at as string,
    };
  });
}

// ─── Get Appointment Review ──────────────────────────────────────────────────

export async function getAppointmentReview(
  tenantId: string,
  appointmentId: string
): Promise<ReviewListItem | null> {
  const supabase = await createClient();

  const { data } = await (supabase as never as Awaited<ReturnType<typeof createClient>>)
    .from("customer_reviews" as never)
    .select("id, rating, comment, status, is_featured, service_name_snapshot, resource_name_snapshot, customer_name_snapshot, business_response, responded_at, submitted_at" as never)
    .eq("tenant_id" as never, tenantId)
    .eq("appointment_id" as never, appointmentId)
    .single();

  if (!data) return null;

  const row = data as unknown as Record<string, unknown>;
  return {
    id: row.id as string,
    rating: row.rating as number,
    comment: (row.comment as string) ?? null,
    status: row.status as ReviewListItem["status"],
    isFeatured: Boolean(row.is_featured),
    serviceNameSnapshot: (row.service_name_snapshot as string) ?? null,
    resourceNameSnapshot: (row.resource_name_snapshot as string) ?? null,
    customerNameSnapshot: (row.customer_name_snapshot as string) ?? null,
    businessResponse: (row.business_response as string) ?? null,
    respondedAt: (row.responded_at as string) ?? null,
    submittedAt: row.submitted_at as string,
  };
}
