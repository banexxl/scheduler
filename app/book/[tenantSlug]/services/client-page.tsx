"use client";

/**
 * Services Client Page — Milestone 17.0.
 *
 * Interactive service selection with category accordions,
 * multi-select, and sticky booking summary.
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { useBooking } from "@/features/booking/hooks/useBooking";
import BookingStepper from "@/features/booking/components/BookingStepper";
import ServiceCategoryGroup from "@/features/booking/components/ServiceCategory";
import ServiceCard from "@/features/booking/components/ServiceCard";
import BookingSummary from "@/features/booking/components/BookingSummary";
import BookingEmptyState from "@/features/booking/components/EmptyState";
import { useTenantTheme } from "@/providers/tenant-theme-provider";
import type { SelectedService } from "@/features/booking/types";
import type { ServiceCategory } from "@/features/booking/actions/booking-data-actions";

type Props = {
  tenantSlug: string;
  categories: ServiceCategory[];
  uncategorized: SelectedService[];
};

export default function ServicesClientPage({
  tenantSlug,
  categories,
  uncategorized,
}: Props) {
  const { state, toggleService } = useBooking();
  const { tenant } = useTenantTheme();
  const selectedIds = new Set(state.services.map((s) => s.id));

  const totalServices = categories.reduce((sum, c) => sum + c.services.length, 0) + uncategorized.length;

  if (totalServices === 0) {
    return (
      <>
        <BookingStepper activeStep="services" />
        <BookingEmptyState
          title="No Services Available"
          description="This business has no services available for booking right now."
        />
      </>
    );
  }

  return (
    <>
      <BookingStepper activeStep="services" />

      <Box sx={{ px: { xs: 0, sm: 1 }, pb: 10 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Select Services
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose one or more services to book with {tenant.name}.
        </Typography>

        {/* Categorized services */}
        <Stack spacing={1.5}>
          {categories.map((cat) => (
            <ServiceCategoryGroup
              key={cat.id}
              categoryName={cat.name}
              services={cat.services}
              selectedIds={selectedIds}
              onToggle={toggleService}
            />
          ))}
        </Stack>

        {/* Uncategorized services */}
        {uncategorized.length > 0 && (
          <Box sx={{ mt: categories.length > 0 ? 2 : 0 }}>
            {categories.length > 0 && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Other Services
              </Typography>
            )}
            <Stack spacing={1}>
              {uncategorized.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  service={svc}
                  selected={selectedIds.has(svc.id)}
                  onToggle={toggleService}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      <BookingSummary continueHref={`/book/${tenantSlug}/staff`} />
    </>
  );
}
