import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { requireTenantMember } from "@/lib/tenants/require-tenant-member";
import { getReviews, getReviewSummary } from "@/features/reviews/services/review-queries";
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
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Reviews
      </Typography>
      <ReviewsClientPage
        tenantSlug={tenantSlug}
        reviews={reviewsResult.items}
        summary={summary}
        canManage={["owner", "admin", "manager"].includes(membership.role)}
      />
    </Box>
  );
}
