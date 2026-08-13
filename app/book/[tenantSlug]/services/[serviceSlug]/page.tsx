import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolvePublishedTenantTheme } from "@/features/branding/services/resolve-tenant-theme";
import JsonLdScript from "@/features/public-site/components/json-ld-script";
import { buildServiceJsonLd } from "@/features/public-site/utils/structured-data";

/**
 * Public Service Detail Page — Milestone 15.13.
 *
 * Shows full service information with booking CTA.
 * Route: /book/{tenantSlug}/services/{serviceSlug}
 *
 * Displays: name, description, duration, price, currency, eligible locations, public staff.
 * Does NOT expose: internal IDs (in URL uses slug), internal notes, booking rules.
 */

type Params = { tenantSlug: string; serviceSlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { tenantSlug, serviceSlug } = await params;
  const data = await loadServiceDetail(tenantSlug, serviceSlug);
  if (!data) return { title: "Service Not Found" };

  return {
    title: `${data.service.name} — ${data.tenantName}`,
    description: data.service.description || `Book ${data.service.name} at ${data.tenantName}`,
    openGraph: {
      title: `${data.service.name} — ${data.tenantName}`,
      description: data.service.description || `${data.service.durationMinutes} min appointment`,
      type: "website",
    },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<Params> }) {
  const { tenantSlug, serviceSlug } = await params;
  const data = await loadServiceDetail(tenantSlug, serviceSlug);

  if (!data) notFound();

  const { service, tenantName, locations, staff, theme } = data;
  const price = Number(service.price);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.backgroundColor }}>
      {/* Header */}
      <Box sx={{ bgcolor: theme.primaryColor, color: "#fff", py: 4, px: 3, textAlign: "center" }}>
        <Typography component="h1" sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 700, mb: 0.5 }}>
          {service.name}
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
          <Chip label={`${service.durationMinutes} min`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }} />
          {price > 0 && (
            <Chip label={`${service.price} ${service.currency}`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }} />
          )}
          {price === 0 && <Chip label="Free" size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }} />}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 700, mx: "auto", px: 2, py: 4 }}>
        {/* Description */}
        {service.description && (
          <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: `${theme.borderRadius}px` }}>
            <Typography sx={{ fontSize: "0.9375rem", color: "text.secondary", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {service.description}
            </Typography>
          </Paper>
        )}

        {/* Details */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: `${theme.borderRadius}px` }}>
          <Stack spacing={1.5}>
            <DetailRow label="Duration" value={`${service.durationMinutes} minutes`} />
            {price > 0 && <DetailRow label="Price" value={`${service.price} ${service.currency}`} />}
            {price === 0 && <DetailRow label="Price" value="Free" />}
            {service.categoryName && <DetailRow label="Category" value={service.categoryName} />}
          </Stack>
        </Paper>

        {/* Available Locations */}
        {locations.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1.5 }}>Available At</Typography>
            <Stack spacing={1}>
              {locations.map(loc => (
                <Paper key={loc.id} variant="outlined" sx={{ p: 2, borderRadius: `${theme.borderRadius}px` }}>
                  <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{loc.name}</Typography>
                  {loc.address && (
                    <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>{loc.address}</Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {/* Staff */}
        {staff.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 600, mb: 1.5 }}>Team</Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {staff.map(s => (
                <Box key={s.id} sx={{ textAlign: "center", width: 80 }}>
                  {s.avatarUrl ? (
                    <Box component="img" src={s.avatarUrl} alt={s.displayName} sx={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", mx: "auto", mb: 0.5 }} />
                  ) : (
                    <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: theme.surfaceColor, mx: "auto", mb: 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Typography sx={{ fontSize: "1rem" }}>{s.displayName.charAt(0)}</Typography>
                    </Box>
                  )}
                  <Typography sx={{ fontSize: "0.6875rem" }}>{s.displayName}</Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* CTA */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ textAlign: "center" }}>
          <Button
            href={`/book/${tenantSlug}#booking`}
            variant="contained"
            size="large"
            sx={{ borderRadius: `${theme.borderRadius}px`, fontWeight: 700 }}
          >
            Book {service.name}
          </Button>
        </Box>
      </Box>

      {/* JSON-LD */}
      <JsonLdScript data={buildServiceJsonLd({
        service: { name: service.name, description: service.description, price: service.price, currency: service.currency, durationMinutes: service.durationMinutes },
        tenantName,
        tenantSlug,
        serviceSlug,
      })} />
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{value}</Typography>
    </Box>
  );
}

// ─── Data Loading ────────────────────────────────────────────────────────────

type ServiceDetailData = {
  service: { name: string; slug: string; description: string | null; durationMinutes: number; price: string; currency: string; categoryName: string | null };
  tenantName: string;
  locations: Array<{ id: string; name: string; address: string | null }>;
  staff: Array<{ id: string; displayName: string; avatarUrl: string | null }>;
  theme: Awaited<ReturnType<typeof resolvePublishedTenantTheme>>;
};

async function loadServiceDetail(tenantSlug: string, serviceSlug: string): Promise<ServiceDetailData | null> {
  const supabase = createServiceRoleClient();

  // Resolve tenant
  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("id, name, status")
    .eq("slug", tenantSlug)
    .single();

  if (!tenantRow || !["active", "trialing"].includes((tenantRow as { status: string }).status)) return null;

  const tenantId = (tenantRow as { id: string }).id;
  const tenantName = (tenantRow as { name: string }).name;

  // Load service
  const { data: svcRow } = await supabase
    .from("services")
    .select("id, name, slug, description, duration_minutes, price, currency, service_category_id")
    .eq("tenant_id", tenantId)
    .eq("slug", serviceSlug)
    .eq("is_active", true)
    .single();

  if (!svcRow) return null;
  const svc = svcRow as unknown as { id: string; name: string; slug: string; description: string | null; duration_minutes: number; price: number; currency: string; service_category_id: string | null };

  // Category name
  let categoryName: string | null = null;
  if (svc.service_category_id) {
    const { data: catRow } = await supabase
      .from("service_categories")
      .select("name")
      .eq("id", svc.service_category_id)
      .single();
    categoryName = (catRow as { name: string } | null)?.name ?? null;
  }

  // Locations offering this service
  const { data: slRows } = await supabase
    .from("service_locations")
    .select("location_id")
    .eq("service_id", svc.id)
    .eq("tenant_id", tenantId);

  const locationIds = ((slRows ?? []) as unknown as Array<{ location_id: string }>).map(r => r.location_id);
  let locations: ServiceDetailData["locations"] = [];
  if (locationIds.length > 0) {
    const { data: locRows } = await supabase
      .from("locations")
      .select("id, name, street_address, city")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .in("id", locationIds);

    locations = ((locRows ?? []) as unknown as Array<{ id: string; name: string; street_address: string | null; city: string | null }>)
      .map(l => ({ id: l.id, name: l.name, address: [l.street_address, l.city].filter(Boolean).join(", ") || null }));
  }

  // Staff who provide this service (via service_resources → staff_profiles)
  const { data: srRows } = await supabase
    .from("service_resources")
    .select("resource_id")
    .eq("service_id", svc.id)
    .eq("tenant_id", tenantId);

  const resourceIds = ((srRows ?? []) as unknown as Array<{ resource_id: string }>).map(r => r.resource_id);
  let staff: ServiceDetailData["staff"] = [];
  if (resourceIds.length > 0) {
    const { data: spRows } = await supabase
      .from("staff_profiles")
      .select("id, display_name, avatar_url, resource_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("is_public", true)
      .in("resource_id", resourceIds);

    staff = ((spRows ?? []) as unknown as Array<{ id: string; display_name: string; avatar_url: string | null }>)
      .map(s => ({ id: s.id, displayName: s.display_name, avatarUrl: s.avatar_url }));
  }

  const theme = await resolvePublishedTenantTheme(tenantId);

  return {
    service: {
      name: svc.name,
      slug: svc.slug,
      description: svc.description,
      durationMinutes: svc.duration_minutes,
      price: String(svc.price),
      currency: svc.currency,
      categoryName,
    },
    tenantName,
    locations,
    staff,
    theme,
  };
}
