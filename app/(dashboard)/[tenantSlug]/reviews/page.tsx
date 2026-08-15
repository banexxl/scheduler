import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getReviews, getReviewSummary } from "@/features/reviews/services/review-queries";
import PageHeader from "@/features/platform/components/page-header";
import MetricCard from "@/features/platform/components/metric-card";
import ReviewsClientPage from "./client-page";

export default async function ReviewsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { tenant, membership } = await requireTenantMember(tenantSlug);

  const [reviewsResult, summary] = await Promise.all([
    getReviews(tenant.id),
    getReviewSummary(tenant.id),
  ]);

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Reviews"
        description="Customer feedback and ratings for your services."
        breadcrumbs={[
          { label: "Dashboard", href: `/${tenantSlug}/dashboard` },
          { label: "Reviews" },
        ]}
      />

      {/* Summary metrics */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard
            label="Average Rating"
            value={summary.averageRating ? summary.averageRating.toFixed(1) : "—"}
            variant={summary.averageRating && summary.averageRating >= 4 ? "success" : "default"}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <MetricCard label="Total Reviews" value={summary.totalReviews} />
        </Grid>
      </Grid>

      <ReviewsClientPage
        tenantSlug={tenantSlug}
        reviews={reviewsResult.items}
        summary={summary}
        canManage={["owner", "admin", "manager"].includes(membership.role)}
      />
    </Stack>
  );
}
